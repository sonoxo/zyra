import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

function validateEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const optional = ["STRIPE_SECRET_KEY", "RESEND_API_KEY", "VITE_STRIPE_PUBLISHABLE_KEY", "BOOTSTRAP_SECRET", "EMAIL_FROM", "HF_TOKEN"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  const unset = optional.filter(k => !process.env[k]);
  if (unset.length > 0) {
    console.warn(`WARN: Optional env vars not set (features will be limited): ${unset.join(", ")}`);
  }
}
validateEnv();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION — process will exit:", err.stack || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
  skip: (req) => !req.path.startsWith("/api"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later" },
});

app.get("/health", async (_req, res) => {
  const checks: Record<string, string> = {};
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }
  const overall = Object.values(checks).every(v => v === "ok") ? "ok" : "degraded";
  res.status(overall === "ok" ? 200 : 503).json({
    status: overall,
    uptime: Math.floor(process.uptime()),
    checks,
    version: process.env.npm_package_version || "unknown",
  });
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  const SENSITIVE_PATHS = ["/api/auth", "/api/api-keys", "/api/admin/env"];
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !SENSITIVE_PATHS.some(sp => path.startsWith(sp))) {
        const body = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${body.length > 200 ? body.slice(0, 200) + "..." : body}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = status === 500 ? "Internal Server Error" : (err.message || "Internal Server Error");

    if (status >= 500) {
      console.error("Server Error:", err.stack || err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      const env = process.env.NODE_ENV || "development";
      const features = [
        process.env.RESEND_API_KEY ? "email" : null,
        process.env.STRIPE_SECRET_KEY ? "stripe" : null,
        process.env.BOOTSTRAP_SECRET ? "bootstrap" : null,
        process.env.HF_TOKEN ? "vision-ai" : null,
      ].filter(Boolean);
      console.log(`\n  ╔═══════════════════════════════════════╗`);
      console.log(`  ║  ZYRA Cybersecurity Platform          ║`);
      console.log(`  ╠═══════════════════════════════════════╣`);
      console.log(`  ║  Port:     ${String(port).padEnd(27)}║`);
      console.log(`  ║  Env:      ${env.padEnd(27)}║`);
      console.log(`  ║  Features: ${(features.length ? features.join(", ") : "none").padEnd(27)}║`);
      console.log(`  ╚═══════════════════════════════════════╝\n`);
    },
  );
})();
