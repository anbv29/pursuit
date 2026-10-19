"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, "unknown", "Failed to load."));

/**
 * Load data from the API with loading / error state.
 * `refreshKey` refetches when it changes (e.g. a sibling panel saved something).
 */
export function useApi<T>(path: string | null, refreshKey: unknown = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let active = true;
    const mine = ++seq.current;
    api<T>(path, { signal: controller.signal })
      .then((d) => {
        if (!active || mine !== seq.current) return;
        setData(d);
        setError(null);
      })
      .catch((e) => active && mine === seq.current && setError(toApiError(e)))
      .finally(() => active && mine === seq.current && setLoading(false));
    return () => { active = false; controller.abort(); };
  }, [path, refreshKey]);

  const reload = useCallback(async () => {
    if (!path) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const d = await api<T>(path);
      if (mine === seq.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError(toApiError(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);

  return { data, error, loading, reload, setData };
}

/** Wrap a mutation so it can't be double-submitted and exposes a pending flag. */
export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (busy.current) return undefined;
      busy.current = true;
      setPending(true);
      try {
        return await fn(...args);
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [fn],
  );
  return { run, pending };
}
