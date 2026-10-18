"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { RequireAuth } from "@/components/session";
import { WorkspaceShell } from "@/components/shell";

export function WorkspaceClient({ children }: { children: ReactNode }) {
  const { ws } = useParams<{ ws: string }>();
  return (
    <RequireAuth>
      <WorkspaceShell wsId={ws}>{children}</WorkspaceShell>
    </RequireAuth>
  );
}
