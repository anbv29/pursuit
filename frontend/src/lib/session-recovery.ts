import { api, ApiError } from "./api";
import type { Session } from "./types";

const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 12_000;

function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 2_000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function recoverReads<T>(read: (signal: AbortSignal) => Promise<T>, caller?: AbortSignal): Promise<T> {
  const deadline = AbortSignal.timeout(STARTUP_TIMEOUT_MS);
  const endsAt = Date.now() + STARTUP_TIMEOUT_MS;
  const signal = caller ? AbortSignal.any([caller, deadline]) : deadline;
  while (!signal.aborted && Date.now() < endsAt) {
    try {
      return await read(signal);
    } catch (error) {
      caller?.throwIfAborted();
      if (!(error instanceof ApiError) || ![0, 500, 502, 503, 504].includes(error.status)) throw error;
      try { await pause(signal); } catch { break; }
    }
  }
  caller?.throwIfAborted();
  throw new ApiError(503, "unavailable", "Pursuit is taking longer to connect. Please try again.");
}

export function waitForBackend() {
  return recoverReads((signal) => api("/health", { signal, timeoutMs: REQUEST_TIMEOUT_MS }));
}

export function restoreSession(caller: AbortSignal): Promise<Session | null> {
  return recoverReads(async (signal) => {
    try {
      return await api<Session>("/auth/me", { signal, timeoutMs: REQUEST_TIMEOUT_MS });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    await api("/health", { signal, timeoutMs: REQUEST_TIMEOUT_MS });
    return null;
  }, caller);
}
