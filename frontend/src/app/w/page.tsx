"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RequireAuth } from "@/components/session";
import { Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Workspace } from "@/lib/types";

function Redirector() {
  const router = useRouter();
  const { data, error, reload } = useApi<Workspace[]>("/workspaces");
  useEffect(() => {
    if (!data) return;
    let last: string | null = null;
    try { last = localStorage.getItem("pursuit.lastWorkspace"); } catch { /* Browser storage is optional. */ }
    const target = data.find((w) => w.id === last) ?? data[0];
    router.replace(target ? `/w/${target.id}` : "/onboarding");
  }, [data, router]);
  if (error) return <div className="mt-24 space-y-4 text-center text-sm"><p role="alert" className="text-danger">{error.message}</p><button className="text-trail underline" onClick={() => void reload()}>Try again</button></div>;
  return <div className="mx-auto mt-24 max-w-md space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-24" /></div>;
}

export default function WorkspacesPage() {
  return <RequireAuth><Redirector /></RequireAuth>;
}
