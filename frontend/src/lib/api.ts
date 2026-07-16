const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

let onUnauthorized: (() => void) | null = null;

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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !isPublicPath()) {
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
