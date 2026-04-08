import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set — using random value. Tokens will NOT survive restarts. Set JWT_SECRET in production.");
}
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

const tokenBlacklist = new Map<string, number>();

const BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of tokenBlacklist) {
    if (exp < now) tokenBlacklist.delete(token);
  }
}, BLACKLIST_CLEANUP_INTERVAL);

export function blacklistToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as any;
    const exp = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
    tokenBlacklist.set(token, exp);
  } catch {
    tokenBlacklist.set(token, Date.now() + 15 * 60 * 1000);
  }
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string, expectedType?: "access" | "refresh"): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { type?: string };
    if (expectedType === "refresh" && decoded.type !== "refresh") return null;
    if (expectedType === "access" && decoded.type === "refresh") return null;
    if (!expectedType && decoded.type === "refresh") return null;
    return { userId: decoded.userId, organizationId: decoded.organizationId, role: decoded.role };
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ message: "Token has been revoked" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
