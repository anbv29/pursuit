"use client";

import { AlertTriangle, FileText, FlaskConical, Inbox, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DecisionChip } from "@/components/bits";
import { useWorkspace } from "@/components/shell";
import { useSession } from "@/components/session";
import { NumberTicker } from "@/components/number-ticker";
import { FounderFocusCard } from "@/components/founder-focus";
import { Badge, Button, buttonStyles, Card, CardHeader, DemoBadge, Empty, Glass, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { ACTION_STATUS, STAGE_LABEL, timeAgo, USE_CASE_LABEL } from "@/lib/labels";
import type { ActionStatus, Decision, ReportListItem, Stage, UseCase } from "@/lib/types";

type Dash = {
  experiments: { id: string; title: string; use_case: UseCase; stage: Stage; is_demo: boolean; updated_at: string; latest_decision: Decision | null }[];
  pending_actions: { id: string; experiment_id: string; experiment_title: string; kind: string; target: string; status: ActionStatus; mode: string }[];
  recent_outcomes: { id: string; experiment_id: string; experiment_title: string; kind: string; origin: string; occurred_at: string }[];
  recommendations: { experiment_id: string; experiment_title: string; decision: Decision; confidence: number; next_action: string; includes_demo_data: boolean }[];
};

type Filter = "all" | "open" | "decided";

export default function Dashboard() {
  const { workspace, base } = useWorkspace();
  const { user } = useSession();
  const { data, loading, error, reload } = useApi<Dash>(`/workspaces/${workspace.id}/dashboard`);
  const reports = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  const [filter, setFilter] = useState<Filter>("all");
  const firstName = user?.name.split(" ")[0] ?? "there";

  useEffect(() => { try { localStorage.setItem("pursuit.lastWorkspace", workspace.id); } catch { /* Optional preference. */ } }, [workspace.id]);

  if (error) {
    return (
      <Glass className="mx-auto mt-6 max-w-lg p-2">
        <Empty icon={<AlertTriangle className="size-5" />} title="Couldn't load the dashboard" body={error.message}
          action={<Button variant="secondary" onClick={() => void reload()}><RotateCw className="size-4" /> Try again</Button>} />
      </Glass>
    );
  }
  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 text-[13px]" aria-busy aria-label="Loading dashboard">
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      </div>
    );
  }

  const newBtn = (
    <Link href={`${base}/experiments/new`} className={buttonStyles("secondary") + " rounded-full"}><Plus className="size-4" aria-hidden /> New experiment</Link>
  );
  const analyzeBtn = (
    <Link href={`${base}/reports/new`} className={buttonStyles("primary") + " rounded-full"}><FileText className="size-4" aria-hidden /> Analyze your company</Link>
  );
  const reportCard = reports.data && reports.data.length > 0 && (
    <Card className="border border-line bg-surface shadow-none">
      <CardHeader title="Company reports" action={<Link href={`${base}/reports`} className="text-[13px] font-semibold text-trail hover:underline">See all</Link>} />
      <ul className="divide-y divide-line">
        {reports.data.slice(0, 3).map((r) => (
          <li key={r.id}>
            <Link href={`${base}/reports/${r.id}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--inset)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-trail-strong"><FileText className="size-4" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{r.company_name || r.company_url}</span>
                <span className="block truncate text-xs text-ink-3">{r.company_url}</span>
              </span>
              <Badge tone={r.status === "SUCCEEDED" ? "good" : r.status === "FAILED" ? "bad" : "neutral"}>
                {r.status === "SUCCEEDED" ? "Ready" : r.status === "FAILED" ? "Failed" : r.status === "CANCELLED" ? "Cancelled" : "Generating…"}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );

  if (data.experiments.length === 0) {
    return (
      <div className="mx-auto mt-2 max-w-xl space-y-6">
        <PageHeader title={`Hi ${firstName}`} description="Your research and experiments will live here." />
        <FounderFocusCard compact />
        {reportCard}
        <Glass className="p-2">
          <Empty icon={<FlaskConical className="size-5" />} title={reports.data?.length ? "No experiments yet" : "Start with a company report"}
            body={reports.data?.length ? "Open your report and choose “Track this” on a recommended experiment." : "Enter your website and Pursuit researches your market, competitors and customers, then recommends experiments."}
            action={reports.data?.length ? newBtn : analyzeBtn} />
        </Glass>
      </div>
    );
  }

  const shown = data.experiments.filter((e) => filter === "all" || (filter === "decided" ? !!e.latest_decision : !e.latest_decision));
  const stats = [
    { label: "Saved experiments", value: data.experiments.length, icon: FlaskConical },
    { label: "Waiting on you", value: data.pending_actions.length, icon: Inbox },
    { label: "Company reports", value: reports.data?.length ?? 0, icon: FileText },
  ];
  const workflows = Object.entries(USE_CASE_LABEL).map(([id, label]) => ({ id, label }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 text-[13px]">
      <PageHeader title={`Hi ${firstName}`}
        description={`${data.experiments.length} saved experiment${data.experiments.length === 1 ? "" : "s"}${data.pending_actions.length > 0 ? ` · ${data.pending_actions.length} waiting on you` : ""}`}
        action={<div className="flex flex-wrap gap-2">{newBtn}{analyzeBtn}</div>} />

      <ul aria-label="Workspace summary" className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface py-4">
        {stats.map((s) => (
          <li key={s.label} className="flex min-w-0 flex-col gap-1 px-4 sm:px-5">
            <span className="flex items-center gap-2 text-xs text-ink-3"><s.icon className="hidden size-3.5 shrink-0 sm:block" aria-hidden />{s.label}</span>
            <NumberTicker value={s.value} className="text-2xl font-semibold tabular-nums tracking-tight text-ink" />
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
        <section aria-labelledby="exp-h" className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="exp-h" className="text-base font-semibold">Experiments</h2>
            <Tabs label="Filter experiments" value={filter} onChange={(v) => { if (v === "all" || v === "open" || v === "decided") setFilter(v); }}
              tabs={[{ id: "all", label: "All" }, { id: "open", label: "No verdict yet" }, { id: "decided", label: "Has a verdict" }]} />
          </div>
          {shown.length === 0 ? (
            <Card className="border border-line bg-surface shadow-none"><Empty title="Nothing in this view" body="Try another filter." /></Card>
          ) : (
            <>
            <ul className="divide-y divide-line sm:hidden" aria-label="Saved experiments">
              {shown.map((e) => <li key={e.id} className="p-4">
                <Link href={`${base}/experiments/${e.id}`} className="block rounded-sm text-sm font-semibold text-ink hover:text-trail hover:underline">{e.title}</Link>
                <p className="mt-1 text-xs text-ink-3">{USE_CASE_LABEL[e.use_case]}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{STAGE_LABEL[e.stage]}</Badge>
                  {e.latest_decision ? <DecisionChip decision={e.latest_decision} /> : <Badge tone="muted">No verdict</Badge>}
                  {e.is_demo && <DemoBadge label="Demo" />}
                </div>
                <p className="mt-2 text-xs text-ink-3">Updated <time dateTime={e.updated_at}>{timeAgo(e.updated_at)}</time></p>
              </li>)}
            </ul>
            <div className="hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="Experiment table, scroll horizontally if needed">
              <table className="w-full min-w-[600px] text-left text-[13px]">
                <caption className="sr-only">Saved experiments with current stage, verdict, and last update</caption>
                <thead className="border-b border-line bg-sunken text-xs text-ink-3"><tr>
                  <th scope="col" className="px-5 py-3 font-medium">Experiment</th>
                  <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                  <th scope="col" className="px-3 py-3 font-medium">Verdict</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Updated</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {shown.map((e) => (<tr key={e.id} className="transition-colors hover:bg-sunken">
                    <td className="max-w-[320px] px-5 py-3.5">
                      <Link href={base + '/experiments/' + e.id} className="block rounded-sm font-semibold text-ink hover:text-trail hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">{e.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">{USE_CASE_LABEL[e.use_case]}{e.is_demo && <DemoBadge label="Demo" />}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5"><span className="inline-flex items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2"><span className="size-1.5 rounded-full bg-orange-500" aria-hidden />{STAGE_LABEL[e.stage]}</span></td>
                    <td className="whitespace-nowrap px-3 py-3.5">{e.latest_decision ? <DecisionChip decision={e.latest_decision} /> : <Badge tone="muted">No verdict</Badge>}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs text-ink-3"><time dateTime={e.updated_at} title={new Date(e.updated_at).toLocaleString()}>{timeAgo(e.updated_at)}</time></td>
                  </tr>))}
                </tbody>
              </table>
              <p className="border-t border-line px-5 py-3 text-xs text-ink-3">{shown.length} of {data.experiments.length} experiments</p>
            </div>
            </>
          )}
        </section>

      <section aria-labelledby="wf-h" className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="wf-h" className="mb-3 text-sm font-semibold">What do you want to find out?</h2>
        <ul className="flex flex-wrap gap-2">
          {workflows.map((w) => (
            <li key={w.id}>
              <Link href={`${base}/experiments/new?type=${w.id}`}
                className="inline-flex min-h-9 items-center rounded-full border border-line px-3 py-1.5 transition-colors hover:bg-accent-soft">
                <span className="min-w-0 flex-1 text-xs font-medium text-ink">{w.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {reportCard ?? (<Card className="border border-line bg-surface shadow-none"><CardHeader title="Company reports" /><Empty title="No reports yet" body="Enter your website to get a sourced company report." action={analyzeBtn} /></Card>)}
        </div>
        <div className="min-w-0 space-y-4">
          <FounderFocusCard compact />
          <Card className="border border-line bg-surface shadow-none">
            <CardHeader title="Needs your attention" action={<Link href={`${base}/approvals`} className="text-[13px] font-semibold text-trail hover:underline">See all</Link>} />
            {data.pending_actions.length === 0 ? (
              <Empty icon={<Inbox className="size-5" />} title="All clear" body="No actions are waiting for approval or confirmation." />
            ) : (
              <ul className="divide-y divide-line">
                {data.pending_actions.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link href={`${base}/experiments/${a.experiment_id}?tab=actions`} className="block px-5 py-3.5 transition-colors hover:bg-[var(--inset)]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={ACTION_STATUS[a.status].tone}>{ACTION_STATUS[a.status].label}</Badge>
                        {a.mode === "demo" && <DemoBadge label="Simulated" />}
                      </div>
                      <p className="mt-1.5 truncate text-sm font-medium text-ink">{a.kind.replace("_", " ")} to {a.target}</p>
                      <p className="truncate text-xs text-ink-3">{a.experiment_title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border border-line bg-surface shadow-none">
            <CardHeader title="Latest recommendations" />
            {data.recommendations.length === 0 ? (
              <Empty title="No recommendations yet" body="Generate one from an experiment once you have evidence and outcomes." />
            ) : (
              <ul className="divide-y divide-line">
                {data.recommendations.map((r) => (
                  <li key={r.experiment_id}>
                    <Link href={`${base}/experiments/${r.experiment_id}`} className="group block px-5 py-3.5 transition-colors hover:bg-[var(--inset)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <DecisionChip decision={r.decision} />
                        <span className="text-xs text-ink-3">{Math.round(r.confidence * 100)}% confidence</span>
                        {r.includes_demo_data && <DemoBadge label="Demo" />}
                      </div>
                      <p className="mt-1.5 truncate text-sm font-semibold text-ink group-hover:text-trail">{r.experiment_title}</p>
                      <p className="line-clamp-2 text-xs text-ink-3">{r.next_action}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {data.recent_outcomes.length > 0 && (
        <Card className="border border-line bg-surface shadow-none">
          <CardHeader title="Recently recorded outcomes" description="Only events actually recorded in Pursuit. Demo events are labelled." />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
            {data.recent_outcomes.map((o) => (
              <li key={o.id} className="border-b border-line px-5 py-3.5 sm:border-r">
                <p className="text-sm font-semibold capitalize text-ink">{o.kind.replace(/_/g, " ")}</p>
                <p className="truncate text-xs text-ink-3">{o.experiment_title} · {timeAgo(o.occurred_at)}</p>
                {o.origin === "demo" && <span className="mt-1.5 inline-block"><DemoBadge label="Demo" /></span>}
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 text-right">
            <Link href={`${base}/experiments/${data.recent_outcomes[0].experiment_id}`} className="text-[13px] font-semibold text-trail hover:underline">
              Open latest
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
