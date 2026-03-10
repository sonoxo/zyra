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

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  return res.json();
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}): Promise<AuthUser> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  return res.json();
}
