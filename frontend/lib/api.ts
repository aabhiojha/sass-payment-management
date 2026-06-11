import { useAuthStore, type AuthUser, type UserRole } from "@/store/authStore";

export const API_BASE = "";

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  role: string;
  fullName: string | null;
  tenantId: number | null;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          useAuthStore.getState().logout();
          return null;
        }
        const data: RefreshResponse = await res.json();
        const authUser: AuthUser = {
          id: data.userId,
          email: data.email,
          role: data.role as UserRole,
          fullName: data.fullName,
          tenantId: data.tenantId,
        };
        useAuthStore.getState().login(authUser, data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        useAuthStore.getState().logout();
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request(path: string, init: RequestInit, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }

  return res;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token
  );
  if (!res.ok) {
    let message = "Request failed";
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }
  return res.json();
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await request(path, {}, token);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export async function apiDelete(path: string, token?: string): Promise<void> {
  const res = await request(path, { method: "DELETE" }, token);
  if (!res.ok) throw new Error("Request failed");
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await request(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token
  );
  if (!res.ok) {
    let message = "Request failed";
    try {
      const err = await res.json();
      message = err.message ?? err.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}
