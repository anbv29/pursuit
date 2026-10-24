"use client";

import { AlertTriangle, FileText, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, buttonStyles, Card, Empty, Glass, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { timeAgo } from "@/lib/labels";
import type { ReportListItem } from "@/lib/types";

const TONE = { QUEUED: "neutral", RUNNING: "neutral", SUCCEEDED: "good", FAILED: "bad", CANCELLED: "muted" } as const;
const LABEL = (s: ReportListItem["status"]) =>
  s === "RUNNING" || s === "QUEUED" ? "Generating…" : s === "SUCCEEDED" ? "Ready" : s === "CANCELLED" ? "Cancelled" : "Failed";

export default function ReportsPage() {
  const { workspace, base } = useWorkspace();
  const { data, error, reload } = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  const cta = (
    <Link href={`${base}/reports/new`} className={buttonStyles("primary")}><Plus className="size-4" aria-hidden /> Analyze a company</Link>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Company reports" description="Sourced go-to-market analyses, generated from a website and your context." action={cta} />
      {workspace.role === "owner" && <div className="rounded-2xl border border-line bg-surface p-5"><h2 className="font-semibold">Try your website first</h2><p className="mt-2 text-sm text-ink-2">Website First Look provides the first four research sections, including your company snapshot and potential customers. Use it for a compact overview before creating a complete report.</p><Link href={`${base}/first-look`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-trail underline underline-offset-4">Open my first look →</Link></div>}
      {error ? (
        <Glass className="p-2">
          <Empty icon={<AlertTriangle className="size-5" />} title="Couldn't load reports" body={error.message}
            action={<Button variant="secondary" onClick={() => void reload()}><RotateCw className="size-4" /> Try again</Button>} />
        </Glass>
      ) : !data ? (
        <Card aria-busy>
          <ul className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        </Card>
      ) : data.length === 0 ? (
        <Glass className="p-2">
          <Empty icon={<FileText className="size-5" />} title="No reports yet" body="Enter your website to get a full, sourced report in a few minutes." action={cta} />
        </Glass>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.map((r, i) => (
              <li key={r.id} className="enter-rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                <Link href={`${base}/reports/${r.id}`} className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--inset)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-trail-strong"><FileText className="size-[18px]" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink group-hover:text-trail">{r.company_name || r.company_url}</p>
                    <p className="truncate text-xs text-ink-3">{r.company_url} · {timeAgo(r.created_at)}</p>
                  </div>
                  <Badge tone={TONE[r.status]}>{LABEL(r.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
