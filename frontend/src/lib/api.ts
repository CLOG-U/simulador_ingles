import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens } from "./tokenStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let onUnauthorized: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  code?: string;
  message?: string;
  field_errors?: Record<string, string[]>;
  request_id?: string;
  detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>;
}

function messageFromErrorBody(body: ErrorBody): string {
  if (body.message) return body.message;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail) && body.detail.length) {
    return body.detail
      .map((item) => item.msg)
      .filter((msg): msg is string => Boolean(msg))
      .join(". ");
  }
  return "Error de conexión con el servidor";
}

function isPublicPath() {
  return window.location.pathname === "/login";
}

export function isAuthPublicPath() {
  return isPublicPath();
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
          clearAuthTokens();
          return false;
        }
        const data = (await response.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (!data.access_token || !data.refresh_token) {
          clearAuthTokens();
          return false;
        }
        setAuthTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        clearAuthTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: authHeaders(init?.headers),
  });

  if (response.status === 401 && retry && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isPublicPath() && path !== "/auth/login") {
      clearAuthTokens();
      onUnauthorized?.();
    }
    let body: ErrorBody = {};
    try {
      body = await response.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      body.code ?? "UNKNOWN",
      messageFromErrorBody(body) || "Error de conexión con el servidor",
      body.field_errors ?? {},
      body.request_id,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch("/health/live");
}
