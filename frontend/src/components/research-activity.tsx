"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ReportListItem } from "@/lib/types";

export function ResearchActivity({ workspaceId, base }: { workspaceId: string; base: string }) {
  const pathname = usePathname();
  const [active, setActive] = useState<ReportListItem | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let delay = 5000;
      try {
        const reports = await api<ReportListItem[]>(`/workspaces/${workspaceId}/reports`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const job = reports.find((report) => report.status === "QUEUED" || report.status === "RUNNING") ?? null;
        setActive(job);
        if (!job) delay = 30000;
      } catch {
        if (controller.signal.aborted) return;
      }
      timer = setTimeout(poll, delay);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [workspaceId, pathname]);

  if (!active || pathname === `${base}/reports/${active.id}`) return null;
  return (
    <Link href={`${base}/reports/${active.id}`}
      className="mb-4 block rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm text-ink">
      <span className="font-semibold">Research in progress</span>
      <span className="ml-2">{active.company_name || active.company_url}</span>
      <span className="mt-1 block text-xs text-ink-2">{active.progress} · View progress</span>
    </Link>
  );
}
