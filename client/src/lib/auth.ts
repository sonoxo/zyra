import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  avatarUrl: string | null;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

const TOKEN_KEY = "zyra_access_token";
const REFRESH_KEY = "zyra_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.user;
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
  clearTokens();
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}): Promise<{ message: string; requiresVerification: boolean; email: string }> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  return res.json();
}
