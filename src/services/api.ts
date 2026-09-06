const TOKEN_KEY = "arcadia_wms_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

/**
 * Lets AuthContext react to a token the server no longer accepts (expired, or
 * signed with a rotated secret). Without this the token is dropped but the app
 * keeps rendering as "logged in" and every screen just fails.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListener = listener;
  return () => {
    if (unauthorizedListener === listener) unauthorizedListener = null;
  };
}

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: object;
}

function buildUrl(path: string, query?: object): string {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return `${url.pathname}${url.search}`;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Every request in the app funnels through here so auth headers, error shape and JSON handling stay consistent. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    notifyIfSessionDied(response.status, token);
    throw new ApiRequestError(response.status, payload?.message ?? "Ha ocurrido un error inesperado.");
  }

  return payload.data as T;
}

/**
 * Only a request that actually carried a token means "your session died";
 * a 401 from the login form is just wrong credentials.
 */
function notifyIfSessionDied(status: number, token: string | null): void {
  if (status === 401 && token) {
    clearToken();
    unauthorizedListener?.();
  }
}

/** Reads the filename the server chose in Content-Disposition, falling back to the caller's. */
function filenameFromResponse(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

/**
 * File downloads (CSV exports) cannot go through apiRequest: the response is not
 * the JSON envelope, and the token lives in a header, so a plain <a href> would
 * hit the endpoint unauthenticated. Errors still arrive as the usual JSON
 * envelope, so they are decoded here into the same ApiRequestError.
 */
export async function apiDownload(
  path: string,
  options: { query?: object; fallbackFilename?: string } = {}
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();

  const response = await fetch(buildUrl(path, options.query), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    notifyIfSessionDied(response.status, token);
    let message = "No se ha podido generar el archivo.";
    try {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (payload?.message) message = payload.message;
    } catch {
      // Not a JSON error body: keep the generic message.
    }
    throw new ApiRequestError(response.status, message);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromResponse(response, options.fallbackFilename ?? "export.csv"),
  };
}
