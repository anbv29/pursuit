"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, "unknown", "Failed to load."));

/**
 * Load data from the API with loading / error state.
 * `refreshKey` refetches when it changes (e.g. a sibling panel saved something).
 */
export function useApi<T>(path: string | null, refreshKey: unknown = 0) {
  type Result = { path: string; data: T | null; error: ApiError | null; loading: boolean };
  const [result, setResult] = useState<Result | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let active = true;
    const mine = ++seq.current;
    api<T>(path, { signal: controller.signal })
      .then((d) => {
        if (!active || mine !== seq.current) return;
        setResult({ path, data: d, error: null, loading: false });
      })
      .catch((e) => {
        if (active && mine === seq.current) setResult({ path, data: null, error: toApiError(e), loading: false });
      });
    return () => { active = false; controller.abort(); };
  }, [path, refreshKey]);

  const reload = useCallback(async () => {
    if (!path) return;
    const mine = ++seq.current;
    setResult((old) => ({ path, data: old?.path === path ? old.data : null, error: null, loading: true }));
    try {
      const d = await api<T>(path);
      if (mine === seq.current) {
        setResult({ path, data: d, error: null, loading: false });
      }
    } catch (e) {
      if (mine === seq.current) setResult({ path, data: null, error: toApiError(e), loading: false });
    }
  }, [path]);

  // Never render another workspace's cached result while the new path loads.
  const current = result?.path === path ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null,
    loading: Boolean(path) && (!current || current.loading), reload };
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
