import type { Express, Request, Response } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import { access, cp, mkdir, rm } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { basename, join, resolve } from "node:path";
import WebSocket from "ws";
import { z } from "zod";
import { requireAuth } from "./auth";

const DEBUG_HOST = "127.0.0.1";
const DEBUG_PORT = Number(process.env.XUNIA_BROWSER_DEBUG_PORT || 9222);
const MANAGED_ROOT = process.env.XUNIA_BROWSER_PROFILE_DIR || join(homedir(), ".xunia", "browser-profile");
const MANAGED_PROFILE = join(MANAGED_ROOT, "Default");

let browserProcess: ChildProcess | null = null;

export const MANAGED_BROWSER_POLICY = {
  mode: "LOCAL_MANAGED_PROFILE",
  localOnly: true,
  credentialExport: false,
  rawCookieExport: false,
  passwordExtraction: false,
  remoteDebuggingHost: DEBUG_HOST,
  authenticatedReadBrowsing: true,
  consequentialActionsRequireHumanApproval: true,
  supportedSchemes: ["http:", "https:"],
} as const;

const importSchema = z.object({
  profileName: z.string().regex(/^(Default|Profile \d+)$/).default("Default"),
});

const openSchema = z.object({
  url: z.string().url(),
});

function chromeUserDataRoot(): string {
  if (platform() === "darwin") return join(homedir(), "Library", "Application Support", "Google", "Chrome");
  if (platform() === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) throw new Error("LOCALAPPDATA is not available");
    return join(localAppData, "Google", "Chrome", "User Data");
  }
  return join(homedir(), ".config", "google-chrome");
}

export function validateBrowserUrl(input: string): URL {
  const url = new URL(input);
  if (!MANAGED_BROWSER_POLICY.supportedSchemes.includes(url.protocol as "http:" | "https:")) {
    throw new Error("ONLY_HTTP_HTTPS_ALLOWED");
  }
  return url;
}

function chromeExecutableCandidates(): string[] {
  if (process.env.XUNIA_CHROME_EXECUTABLE) return [process.env.XUNIA_CHROME_EXECUTABLE];
  if (platform() === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ];
  }
  if (platform() === "win32") {
    return [
      join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    ];
  }
  return ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
}

async function findChromeExecutable(): Promise<string> {
  for (const candidate of chromeExecutableCandidates()) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported local Chrome/Chromium path.
    }
  }
  throw new Error("CHROME_EXECUTABLE_NOT_FOUND");
}

function copyFilter(source: string): boolean {
  const name = basename(source);
  const excluded = [
    "SingletonCookie",
    "SingletonLock",
    "SingletonSocket",
    "BrowserMetrics",
    "Crashpad",
    "GPUCache",
    "Code Cache",
    "Cache",
  ];
  return !excluded.includes(name);
}

export async function importExistingChromeProfile(profileName = "Default"): Promise<{ managedRoot: string; profileName: string }> {
  const parsed = importSchema.parse({ profileName });
  const sourceRoot = chromeUserDataRoot();
  const sourceProfile = resolve(sourceRoot, parsed.profileName);
  if (!sourceProfile.startsWith(resolve(sourceRoot))) throw new Error("INVALID_PROFILE_PATH");
  await access(sourceProfile);

  await mkdir(MANAGED_ROOT, { recursive: true });
  await rm(MANAGED_PROFILE, { recursive: true, force: true });
  await cp(sourceProfile, MANAGED_PROFILE, { recursive: true, filter: copyFilter });

  const localState = join(sourceRoot, "Local State");
  try {
    await cp(localState, join(MANAGED_ROOT, "Local State"));
  } catch {
    // Chrome can still start; the user may need to sign in once in the managed profile.
  }

  return { managedRoot: MANAGED_ROOT, profileName: parsed.profileName };
}

export async function browserStatus(): Promise<{ running: boolean; managedRoot: string; debugPort: number; browser?: string }> {
  try {
    const response = await fetch(`http://${DEBUG_HOST}:${DEBUG_PORT}/json/version`);
    if (!response.ok) throw new Error("debug endpoint unavailable");
    const body = await response.json() as { Browser?: string };
    return { running: true, managedRoot: MANAGED_ROOT, debugPort: DEBUG_PORT, browser: body.Browser };
  } catch {
    return { running: false, managedRoot: MANAGED_ROOT, debugPort: DEBUG_PORT };
  }
}

export async function launchManagedBrowser(): Promise<Awaited<ReturnType<typeof browserStatus>>> {
  const current = await browserStatus();
  if (current.running) return current;

  await mkdir(MANAGED_PROFILE, { recursive: true });
  const executable = await findChromeExecutable();
  browserProcess = spawn(executable, [
    `--user-data-dir=${MANAGED_ROOT}`,
    "--profile-directory=Default",
    `--remote-debugging-address=${DEBUG_HOST}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { detached: false, stdio: "ignore" });
  browserProcess.unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    const status = await browserStatus();
    if (status.running) return status;
  }
  throw new Error("MANAGED_BROWSER_START_TIMEOUT");
}

export async function openAuthenticatedPage(input: string): Promise<{ id: string; title: string; url: string }> {
  const url = validateBrowserUrl(input);
  await launchManagedBrowser();
  const response = await fetch(`http://${DEBUG_HOST}:${DEBUG_PORT}/json/new?${encodeURIComponent(url.toString())}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error(`CHROME_TARGET_CREATE_FAILED_${response.status}`);
  const target = await response.json() as { id: string; title: string; url: string };
  return { id: target.id, title: target.title, url: target.url };
}

type ChromeTarget = {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

async function listTargets(): Promise<ChromeTarget[]> {
  const response = await fetch(`http://${DEBUG_HOST}:${DEBUG_PORT}/json/list`);
  if (!response.ok) throw new Error("CHROME_TARGET_LIST_FAILED");
  return response.json() as Promise<ChromeTarget[]>;
}

async function cdpEvaluate(webSocketDebuggerUrl: string, expression: string): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const requestId = 1;
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error("CDP_EVALUATE_TIMEOUT"));
    }, 10_000);

    socket.on("open", () => {
      socket.send(JSON.stringify({
        id: requestId,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true },
      }));
    });
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as {
        id?: number;
        error?: { message: string };
        result?: { result?: { value?: unknown } };
      };
      if (message.id !== requestId) return;
      clearTimeout(timer);
      socket.close();
      if (message.error) reject(new Error(message.error.message));
      else resolvePromise(message.result?.result?.value);
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export async function readAuthenticatedPage(targetId?: string): Promise<{ id: string; title: string; url: string; text: string }> {
  await launchManagedBrowser();
  const targets = await listTargets();
  const target = targetId
    ? targets.find((candidate) => candidate.id === targetId)
    : targets.find((candidate) => candidate.type === "page" && candidate.url.startsWith("http"));
  if (!target?.webSocketDebuggerUrl) throw new Error("READABLE_BROWSER_TARGET_NOT_FOUND");

  const value = await cdpEvaluate(
    target.webSocketDebuggerUrl,
    "document.body ? document.body.innerText.slice(0, 100000) : ''",
  );
  return {
    id: target.id,
    title: target.title,
    url: target.url,
    text: typeof value === "string" ? value : "",
  };
}

export function registerManagedBrowserRoutes(app: Express): void {
  app.get("/api/browser/status", requireAuth, async (_req: Request, res: Response) => {
    res.json({ policy: MANAGED_BROWSER_POLICY, ...(await browserStatus()) });
  });

  app.post("/api/browser/profile/import", requireAuth, async (req: Request, res: Response) => {
    const parsed = importSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
    try {
      const result = await importExistingChromeProfile(parsed.data.profileName);
      return res.json({ ...result, note: "Local profile copy created. No credentials or cookies were exported from this machine." });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "PROFILE_IMPORT_FAILED" });
    }
  });

  app.post("/api/browser/start", requireAuth, async (_req: Request, res: Response) => {
    try {
      return res.json(await launchManagedBrowser());
    } catch (error) {
      return res.status(500).json({ message: error instanceof Error ? error.message : "BROWSER_START_FAILED" });
    }
  });

  app.post("/api/browser/open", requireAuth, async (req: Request, res: Response) => {
    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
    try {
      return res.json(await openAuthenticatedPage(parsed.data.url));
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "BROWSER_OPEN_FAILED" });
    }
  });

  app.get("/api/browser/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const targetId = typeof req.query.targetId === "string" ? req.query.targetId : undefined;
      return res.json(await readAuthenticatedPage(targetId));
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "BROWSER_READ_FAILED" });
    }
  });
}
