"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, errorMessage, setCsrf } from "@/lib/api";
import { restoreSession, waitForBackend } from "@/lib/session-recovery";
import type { Session, User } from "@/lib/types";
import { Button, Skeleton } from "./ui";

type Ctx = {
  user: User | null;
  ready: boolean;
  sessionError: string | null;
  retrySession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const SessionCtx = createContext<Ctx | null>(null);

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession outside SessionProvider");
  return c;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const restoring = useRef<AbortController | null>(null);

  const accept = (s: Session) => {
    restoring.current?.abort();
    setCsrf(s.csrf_token);
    setUser(s.user);
    setSessionError(null);
    setReady(true);
  };

  useEffect(() => {
    const controller = new AbortController();
    restoring.current = controller;
    restoreSession(controller.signal)
      .then((session) => {
        if (controller.signal.aborted) return;
        if (session) accept(session);
        else { setCsrf(null); setUser(null); setReady(true); }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setSessionError(errorMessage(e));
      });
    return () => controller.abort();
  }, [attempt]);

  const retrySession = () => { setSessionError(null); setReady(false); setAttempt((value) => value + 1); };

  const login = useCallback(async (email: string, password: string) => {
    await waitForBackend();
    accept(await api<Session>("/auth/login", { json: { email, password } }));
  }, []);
  const register = useCallback(async (email: string, name: string, password: string) => {
    await waitForBackend();
    accept(await api<Session>("/auth/register", { json: { email, name, password } }));
  }, []);
  const logout = useCallback(async () => {
    restoring.current?.abort();
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (e) {
      // A revoked session is already signed out. Network failures are not.
      if (!(e instanceof ApiError && e.status === 401)) throw e;
    }
    setCsrf(null);
    setUser(null);
  }, []);

  return <SessionCtx.Provider value={{ user, ready, sessionError, retrySession, login, register, logout }}>{children}</SessionCtx.Provider>;
}

/** Renders children only for signed-in users; otherwise sends them to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, sessionError, retrySession } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (sessionError && !ready) return (
    <div className="mx-auto mt-24 max-w-md space-y-4 px-6 text-center">
      <p role="alert" className="text-sm text-ink-2">{sessionError}</p>
      <Button variant="secondary" onClick={retrySession}>Try connecting again</Button>
    </div>
  );
  if (!ready || !user) {
    return (
      <div className="mx-auto mt-24 w-full max-w-md space-y-3 px-6" aria-label="Loading">
        <p role="status" className="text-sm text-ink-2">Connecting to Pursuit…</p>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
