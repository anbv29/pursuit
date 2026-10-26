"use client";
import Link from "next/link";
import { useWorkspace } from "@/components/shell";
import { useApi } from "@/lib/hooks";
import type { ReportListItem } from "@/lib/types";
import { buttonStyles, Glass, Notice, PageHeader, Skeleton } from "@/components/ui";
export default function GTMPage() {
  const { workspace, base } = useWorkspace();
  const reports = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  return <div className="mx-auto max-w-3xl space-y-6">
    <PageHeader title="GTM strategy" description="Choose a saved company report to build or refine a plan around your buyers, budget and time." />
    {workspace.role === "owner" && <Link href={`${base}/reports/new`} className={buttonStyles("primary")}>Create a report and strategy</Link>}
    {reports.error && <Notice tone="bad">Could not load saved reports. Please reload to try again.</Notice>}
    {!reports.data && !reports.error && <Skeleton className="h-40" />}
    {reports.data && <Glass className="p-5"><h2 className="mb-4 font-semibold">Saved company reports</h2>
      {!reports.data.length && <p className="text-sm text-ink-2">No saved reports yet. Start with your company website and the resources you have available.</p>}
      <ul className="space-y-3">{reports.data.map(r => <li key={r.id}><Link className="block rounded-xl border border-line p-4 text-trail hover:bg-accent-soft [overflow-wrap:anywhere]" href={`${base}/reports/${r.id}#gtm-strategy`}><span className="font-semibold">{r.company_name || r.company_url}</span><span className="mt-1 block text-xs text-ink-2">{r.status === "SUCCEEDED" ? "Open strategy and research" : r.status.replaceAll("_", " ")}</span></Link></li>)}</ul>
    </Glass>}
  </div>;
}
