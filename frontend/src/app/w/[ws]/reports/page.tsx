"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/shell";
import { Badge, Card, CardHeader, Empty, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { timeAgo } from "@/lib/labels";
import type { ReportListItem } from "@/lib/types";

const TONE = { QUEUED: "neutral", RUNNING: "neutral", SUCCEEDED: "good", FAILED: "bad" } as const;

export default function ReportsPage() {
  const { workspace, base } = useWorkspace();
  const { data, error } = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  const cta = (
    <Link href={`${base}/reports/new`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-trail px-3.5 text-sm font-medium text-white shadow-card hover:bg-trail-strong">
      <Plus className="size-4" /> Analyze a company
    </Link>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company reports</h1>
          <p className="mt-1 text-sm text-ink-3">Sourced GTM analyses generated from a website and your context.</p>
        </div>
        {cta}
      </div>
      <Card>
        <CardHeader title="All reports" />
        {error ? <Empty title="Couldn't load reports" body={error.message} />
          : !data ? <div className="p-5"><Skeleton className="h-24" /></div>
            : data.length === 0 ? <Empty icon={<FileText className="size-5" />} title="No reports yet" body="Enter your website to get a full report in a few minutes." action={cta} />
              : (
                <ul className="divide-y divide-line">
                  {data.map((r) => (
                    <li key={r.id}>
                      <Link href={`${base}/reports/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{r.company_name || r.company_url}</p>
                          <p className="truncate text-xs text-ink-3">{r.company_url} · {timeAgo(r.created_at)}</p>
                        </div>
                        <Badge tone={TONE[r.status]}>{r.status === "RUNNING" || r.status === "QUEUED" ? "Generating…" : r.status === "SUCCEEDED" ? "Ready" : "Failed"}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
      </Card>
    </div>
  );
}
