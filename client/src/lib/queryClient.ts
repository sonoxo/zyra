import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, refreshAccessToken, clearTokens } from "./auth";

const UI_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_UI_PREVIEW === "true";

function getUiPreviewData(url: string): unknown | undefined {
  if (!UI_PREVIEW) return undefined;

  if (url === "/api/auth/me") {
    return {
      id: "ui-preview-user",
      username: "preview",
      email: "preview@nxyz.local",
      fullName: "NXYZ UI Preview",
      role: "owner",
      avatarUrl: null,
      organizationId: "ui-preview-org",
      organization: {
        id: "ui-preview-org",
        name: "ZYRA / NXYZ Preview",
        slug: "zyra-nxyz-preview",
        plan: "preview",
      },
    };
  }

  if (url === "/api/notifications") {
    return { notifications: [], unreadCount: 0 };
  }

  if (url === "/api/billing/subscription") {
    return {
      id: "ui-preview-subscription",
      organizationId: "ui-preview-org",
      plan: "preview",
      status: "active",
      trialDaysRemaining: 0,
      trialExpired: false,
    };
  }

  if (url === "/api/war-room/status") {
    const observedAt = new Date().toISOString();
    return {
      mode: "UI_PREVIEW",
      execution: "DISPLAY_ONLY",
      observedAt,
      connectors: [
        {
          id: "zyra-local",
          label: "Zyra local control-plane preview",
          category: "LOCAL",
          state: "CONNECTED",
          source: "preview://zyra",
          observedAt,
          detail: { authenticatedApi: false, executionPath: "UI_PREVIEW_ONLY" },
        },
        {
          id: "public-weather",
          label: "National Weather Service public alerts — simulated preview",
          category: "PUBLIC_WEATHER",
          state: "CONNECTED",
          source: "preview://public-weather",
          observedAt,
          detail: { activeAlerts: 4, mode: "SIMULATED_PREVIEW" },
        },
        {
          id: "public-orbital",
          label: "Public orbital catalog — simulated preview",
          category: "PUBLIC_ORBITAL",
          state: "CONNECTED",
          source: "preview://public-orbital",
          observedAt,
          detail: { publicObjects: 12, mode: "SIMULATED_PREVIEW" },
        },
        {
          id: "antarctica-public-weather",
          label: "Antarctica research weather — simulated preview",
          category: "PUBLIC_RESEARCH",
          state: "CONNECTED",
          source: "preview://antarctica",
          observedAt,
          detail: { temperatureC: -18, windKph: 21, mode: "SIMULATED_PREVIEW" },
        },
      ],
      summary: { total: 4, connected: 4, degraded: 0, unavailable: 0, unknown: 0 },
      components: {
        warRoomUi: "CONNECTED",
        livePublicData: "SIMULATED_PREVIEW",
        goldenShieldExecution: "NOT_CONNECTED",
        missionTwinExecution: "NOT_CONNECTED",
        mitoExecution: "DISABLED",
        etherPersistence: "NOT_CONNECTED",
      },
      allowedDecisionSupport: [
        "defensive readiness",
        "maintenance readiness",
        "public geospatial awareness",
        "public orbital awareness",
        "continuity planning",
        "critical-infrastructure resilience",
      ],
      blockedControlFunctions: [
        "target selection",
        "weapon release",
        "fire control",
        "strike planning",
        "direct drone flight control",
        "autonomous lethal action",
        "offensive cyber execution",
      ],
    };
  }

  return undefined;
}

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleUnauthorized(res: Response, retry: () => Promise<Response>): Promise<Response> {
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return retry();
    }
    clearTokens();
  }
  return res;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (UI_PREVIEW) {
    throw new Error("UI preview mode is read-only and does not execute API mutations.");
  }

  const doFetch = () =>
    fetch(url, {
      method,
      headers: getAuthHeaders(data ? { "Content-Type": "application/json" } : {}),
      body: data ? JSON.stringify(data) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/refresh")) {
    res = await handleUnauthorized(res, doFetch);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;

    const previewData = getUiPreviewData(url);
    if (previewData !== undefined) return previewData as T;

    const doFetch = () =>
      fetch(url, {
        headers: getAuthHeaders(),
      });

    let res = await doFetch();

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        res = await fetch(url, { headers: getAuthHeaders() });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
