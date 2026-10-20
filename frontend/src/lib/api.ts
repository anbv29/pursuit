// Thin client for the Pursuit API. Same-origin (/api is proxied), cookie-based
// session, CSRF token sent on every mutating request.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrf = (t: string | null) => {
  csrfToken = t;
};

type Detail = { loc?: (string | number)[]; msg?: string };

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const b = body as { error?: { code: string; message: string }; detail?: Detail[] | string } | null;
  if (b?.error) return new ApiError(res.status, b.error.code, b.error.message);
  if (Array.isArray(b?.detail)) {
    const fields: Record<string, string> = {};
    for (const d of b.detail) {
      const key = String(d.loc?.[d.loc.length - 1] ?? "form");
      fields[key] = (d.msg ?? "Invalid value").replace(/^Value error, /, "");
    }
    return new ApiError(res.status, "validation", "Please fix the highlighted fields.", fields);
  }
  if (res.status >= 500) return new ApiError(res.status, "server", "The server had a problem. Try again.");
  return new ApiError(res.status, "http", `Request failed (${res.status}).`);
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 45_000, ...requestInit } = init;
  const method = (init.method ?? (init.json !== undefined ? "POST" : "GET")).toUpperCase();
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  if (method !== "GET" && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  let res: Response;
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    res = await fetch(`/api${path}`, {
      ...requestInit,
      method,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch {
    throw new ApiError(0, timeout.aborted ? "timeout" : "network", timeout.aborted
      ? "Pursuit took too long to respond. Check the latest status before retrying an action."
      : "Can't reach Pursuit. Check your connection.");
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something unexpected happened.";
