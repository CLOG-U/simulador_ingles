const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

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
    let body: ErrorBody = {};
    try {
      body = await response.json();
    } catch {
      /* ignore */
    }
    throw new ApiError(
      body.code ?? "UNKNOWN",
      body.message ?? "Error de conexión con el servidor",
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
