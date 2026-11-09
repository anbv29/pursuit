"use client";

import { AlertTriangle, FileText, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, buttonStyles, Card, Empty, Glass, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { timeAgo } from "@/lib/labels";
import type { ReportListItem } from "@/lib/types";

const TONE = { QUEUED: "neutral", RUNNING: "neutral", SUCCEEDED: "good", FAILED: "bad", CANCELLED: "muted" } as const;
const LABEL = (s: ReportListItem["status"]) =>
  s === "RUNNING" || s === "QUEUED" ? "Generating…" : s === "SUCCEEDED" ? "Ready" : s === "CANCELLED" ? "Cancelled" : "Failed";

export default function ReportsPage() {
  const { workspace, base, workflowsReady } = useWorkspace();
  const { data, error, reload } = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  const generating = data?.some((report) => report.status === "QUEUED" || report.status === "RUNNING");
  useEffect(() => {
    if (!generating) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await reload();
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [generating, reload]);
  const cta = (
    <Link href={`${base}/reports/new`} className={buttonStyles("primary")}><Plus className="size-4" aria-hidden /> Analyze a company</Link>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader title="Reports" description="Company research and GTM strategies, saved together." action={cta} />
      {workflowsReady && <div className="grid gap-3 border-b border-line pb-6 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-ink-2">Open a report for its research, strategy and recommended experiments.</p>
        <Link href={`${base}/gtm`} className="inline-flex min-h-11 items-center font-semibold text-trail hover:underline">Browse GTM strategies</Link>
      </div>}
      {error && !data ? (
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
        <section aria-label="Saved reports" className="overflow-hidden rounded-xl border border-line bg-surface">
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_8rem_7rem] gap-4 border-b border-line bg-sunken px-6 py-3 text-xs font-medium text-ink-3 sm:grid"><span>Company</span><span>Created</span><span className="text-right">Status</span></div>
          <ul className="divide-y divide-line">
            {data.map((r) => (
              <li key={r.id}>
                <Link href={`${base}/reports/${r.id}`} className="group grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 transition-colors hover:bg-[var(--inset)] sm:grid-cols-[minmax(0,1fr)_8rem_7rem] sm:gap-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold text-ink [overflow-wrap:anywhere] group-hover:underline">{r.company_name || r.company_url}</p>
                    <p className="mt-1 text-xs text-ink-3 [overflow-wrap:anywhere]">{r.company_url}</p>
                    <time dateTime={r.created_at} className="mt-2 block text-xs text-ink-3 sm:hidden">{timeAgo(r.created_at)}</time>
                  </div>
                  <time dateTime={r.created_at} className="hidden text-xs text-ink-3 sm:block">{timeAgo(r.created_at)}</time>
                  <span className="justify-self-end"><Badge tone={TONE[r.status]}>{LABEL(r.status)}</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
