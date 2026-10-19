"use client";

import { AlertTriangle, FileText, FlaskConical, Inbox, Plus, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { DecisionChip, StageBar } from "@/components/bits";
import { useWorkspace } from "@/components/shell";
import { useSession } from "@/components/session";
import { Badge, Button, buttonStyles, Card, CardHeader, DemoBadge, Empty, Glass, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { ACTION_STATUS, timeAgo, USE_CASE_LABEL } from "@/lib/labels";
import type { ActionStatus, Decision, ReportListItem, Stage, UseCase } from "@/lib/types";

type Dash = {
  experiments: { id: string; title: string; use_case: UseCase; stage: Stage; is_demo: boolean; updated_at: string; latest_decision: Decision | null }[];
  pending_actions: { id: string; experiment_id: string; experiment_title: string; kind: string; target: string; status: ActionStatus; mode: string }[];
  recent_outcomes: { id: string; experiment_id: string; experiment_title: string; kind: string; origin: string; occurred_at: string }[];
  recommendations: { experiment_id: string; experiment_title: string; decision: Decision; confidence: number; next_action: string; includes_demo_data: boolean }[];
};

type Filter = "all" | "open" | "decided";
const stagger = (i: number) => ({ "--i": Math.min(i, 8) }) as CSSProperties;

export default function Dashboard() {
  const { workspace, base } = useWorkspace();
  const { user } = useSession();
  const { data, loading, error, reload } = useApi<Dash>(`/workspaces/${workspace.id}/dashboard`);
  const reports = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);
  const [filter, setFilter] = useState<Filter>("all");
  const firstName = user?.name.split(" ")[0] ?? "there";

  useEffect(() => localStorage.setItem("pursuit.lastWorkspace", workspace.id), [workspace.id]);

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
      <div className="mx-auto max-w-6xl space-y-6" aria-busy aria-label="Loading dashboard">
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      </div>
    );
  }

  const newBtn = (
    <Link href={`${base}/experiments/new`} className={buttonStyles("secondary")}><Plus className="size-4" aria-hidden /> New experiment</Link>
  );
  const analyzeBtn = (
    <Link href={`${base}/reports/new`} className={buttonStyles("primary")}><FileText className="size-4" aria-hidden /> Analyze your company</Link>
  );
  const reportCard = reports.data && reports.data.length > 0 && (
    <Card>
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
                {r.status === "SUCCEEDED" ? "Ready" : r.status === "FAILED" ? "Failed" : "Generating…"}
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
    { label: "Active experiments", value: data.experiments.length, icon: FlaskConical },
    { label: "Waiting on you", value: data.pending_actions.length, icon: Inbox },
    { label: "Company reports", value: reports.data?.length ?? 0, icon: FileText },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={`Hi ${firstName}`}
        description={`${data.experiments.length} active experiment${data.experiments.length === 1 ? "" : "s"}${data.pending_actions.length > 0 ? ` · ${data.pending_actions.length} waiting on you` : ""}`}
        action={<>{analyzeBtn}{newBtn}</>} />

      <ul className="grid gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <li key={s.label} className="enter-rise" style={stagger(i)}>
            <Card as="div" className="flex items-center gap-4 p-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-trail-strong"><s.icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block font-display text-2xl font-bold tabular-nums text-ink">{s.value}</span>
                <span className="block text-[13px] text-ink-3">{s.label}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>

      {reportCard}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="exp-h" className="min-w-0 space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="exp-h" className="font-display text-lg font-bold">Experiments</h2>
            <Tabs label="Filter experiments" value={filter} onChange={(v) => setFilter(v as Filter)}
              tabs={[{ id: "all", label: "All" }, { id: "open", label: "No verdict yet" }, { id: "decided", label: "Has a verdict" }]} />
          </div>
          {shown.length === 0 ? (
            <Card><Empty title="Nothing in this view" body="Try another filter." /></Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {shown.map((e, i) => (
                <li key={e.id} className="enter-rise" style={stagger(i)}>
                  <Link href={`${base}/experiments/${e.id}`}
                    className="surface press group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[var(--shadow-pop)]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium text-ink-3">{USE_CASE_LABEL[e.use_case]}</span>
                      {e.latest_decision ? <DecisionChip decision={e.latest_decision} /> : <Badge tone="muted">No verdict</Badge>}
                    </div>
                    <p className="line-clamp-2 font-semibold text-ink group-hover:text-trail">{e.title}</p>
                    <div className="mt-auto flex items-end justify-between gap-2">
                      <StageBar stage={e.stage} />
                      {e.is_demo && <DemoBadge label="Demo" />}
                    </div>
                    <p className="text-xs text-ink-3">Updated {timeAgo(e.updated_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Card>
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

          <Card>
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
        <Card>
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
