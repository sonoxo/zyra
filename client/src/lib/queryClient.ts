import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, refreshAccessToken, clearTokens } from "./auth";

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
