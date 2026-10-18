"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RequireAuth } from "@/components/session";
import { Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Workspace } from "@/lib/types";

function Redirector() {
  const router = useRouter();
  const { data, error } = useApi<Workspace[]>("/workspaces");
  useEffect(() => {
    if (!data) return;
    const last = localStorage.getItem("pursuit.lastWorkspace");
    const target = data.find((w) => w.id === last) ?? data[0];
    router.replace(target ? `/w/${target.id}` : "/onboarding");
  }, [data, router]);
  if (error) return <p className="mt-24 text-center text-sm text-d-stop">{error.message}</p>;
  return <div className="mx-auto mt-24 max-w-md space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-24" /></div>;
}

export default function WorkspacesPage() {
  return <RequireAuth><Redirector /></RequireAuth>;
}
