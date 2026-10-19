"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, setCsrf } from "@/lib/api";
import type { Session, User } from "@/lib/types";
import { Skeleton } from "./ui";

type Ctx = {
  user: User | null;
  ready: boolean;
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

  const accept = (s: Session) => {
    setCsrf(s.csrf_token);
    setUser(s.user);
  };

  useEffect(() => {
    api<Session>("/auth/me")
      .then(accept)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.warn("Session check failed", e);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    accept(await api<Session>("/auth/login", { json: { email, password } }));
  }, []);
  const register = useCallback(async (email: string, name: string, password: string) => {
    accept(await api<Session>("/auth/register", { json: { email, name, password } }));
  }, []);
  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (e) {
      // A revoked session is already signed out. Network failures are not.
      if (!(e instanceof ApiError && e.status === 401)) throw e;
    }
    setCsrf(null);
    setUser(null);
  }, []);

  return <SessionCtx.Provider value={{ user, ready, login, register, logout }}>{children}</SessionCtx.Provider>;
}

/** Renders children only for signed-in users; otherwise sends them to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user) {
    return (
      <div className="mx-auto mt-24 w-full max-w-md space-y-3 px-6" aria-label="Loading">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
