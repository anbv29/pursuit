"use client";

import { ArrowRight, FileText, FlaskConical, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { DecisionChip, StageBar } from "@/components/bits";
import { useWorkspace } from "@/components/shell";
import { useSession } from "@/components/session";
import { Badge, Card, CardHeader, DemoBadge, Empty, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { ACTION_STATUS, timeAgo, USE_CASE_LABEL } from "@/lib/labels";
import type { ActionStatus, Decision, ReportListItem, Stage, UseCase } from "@/lib/types";

type Dash = {
  experiments: { id: string; title: string; use_case: UseCase; stage: Stage; is_demo: boolean; updated_at: string; latest_decision: Decision | null }[];
  pending_actions: { id: string; experiment_id: string; experiment_title: string; kind: string; target: string; status: ActionStatus; mode: string }[];
  recent_outcomes: { id: string; experiment_id: string; experiment_title: string; kind: string; origin: string; occurred_at: string }[];
  recommendations: { experiment_id: string; experiment_title: string; decision: Decision; confidence: number; next_action: string; includes_demo_data: boolean }[];
};

export default function Dashboard() {
  const { workspace, base } = useWorkspace();
  const { user } = useSession();
  const { data, loading, error } = useApi<Dash>(`/workspaces/${workspace.id}/dashboard`);
  const reports = useApi<ReportListItem[]>(`/workspaces/${workspace.id}/reports`);

  useEffect(() => localStorage.setItem("pursuit.lastWorkspace", workspace.id), [workspace.id]);

  if (error) return <Empty title="Couldn't load the dashboard" body={error.message} />;
  if (loading || !data) {
    return <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>;
  }

  const newBtn = (
    <Link href={`${base}/experiments/new`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-ink shadow-card hover:bg-sunken">
      <Plus className="size-4" /> New experiment
    </Link>
  );

  const analyzeBtn = (
    <Link href={`${base}/reports/new`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-trail px-3.5 text-sm font-medium text-white shadow-card hover:bg-trail-strong">
      <FileText className="size-4" /> Analyze your company
    </Link>
  );
  const reportCard = reports.data && reports.data.length > 0 && (
    <Card>
      <CardHeader title="Company reports" action={<Link href={`${base}/reports`} className="text-xs font-medium text-trail">All</Link>} />
      <ul className="divide-y divide-line">
        {reports.data.slice(0, 3).map((r) => (
          <li key={r.id}>
            <Link href={`${base}/reports/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper">
              <FileText className="size-4 shrink-0 text-ink-3" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.company_name || r.company_url}</span>
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
      <div className="mx-auto mt-6 max-w-xl space-y-6">
        {reportCard}
        <Card>
          <Empty icon={<FlaskConical className="size-5" />} title={reports.data?.length ? "No experiments yet" : "Start with a company report"}
            body={reports.data?.length ? "Open your report and click “Track this” on a recommended experiment." : "Enter your website and Pursuit researches your market, competitors and customers, then recommends experiments."}
            action={reports.data?.length ? newBtn : analyzeBtn} />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {user?.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {data.experiments.length} active experiment{data.experiments.length === 1 ? "" : "s"}
            {data.pending_actions.length > 0 && ` · ${data.pending_actions.length} waiting on you`}
          </p>
        </div>
        <div className="flex gap-2">{analyzeBtn}{newBtn}</div>
      </div>
      {reportCard}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Active experiments" />
          <ul className="divide-y divide-line">
            {data.experiments.map((e) => (
              <li key={e.id}>
                <Link href={`${base}/experiments/${e.id}`} className="group flex items-center gap-4 px-5 py-4 hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium group-hover:text-trail">{e.title}</p>
                      {e.is_demo && <DemoBadge label="Demo" />}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-3">{USE_CASE_LABEL[e.use_case]} · updated {timeAgo(e.updated_at)}</p>
                  </div>
                  <div className="hidden sm:block"><StageBar stage={e.stage} /></div>
                  <div className="w-24 text-right">{e.latest_decision ? <DecisionChip decision={e.latest_decision} /> : <span className="text-xs text-ink-3">No verdict</span>}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs your attention" action={<Link href={`${base}/approvals`} className="text-xs font-medium text-trail">All</Link>} />
            {data.pending_actions.length === 0 ? (
              <Empty icon={<Inbox className="size-4" />} title="All clear" body="No actions are waiting for approval or confirmation." />
            ) : (
              <ul className="divide-y divide-line">
                {data.pending_actions.slice(0, 5).map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <Link href={`${base}/experiments/${a.experiment_id}?tab=actions`} className="block hover:text-trail">
                      <div className="flex items-center gap-2">
                        <Badge tone={ACTION_STATUS[a.status].tone}>{ACTION_STATUS[a.status].label}</Badge>
                        {a.mode === "demo" && <DemoBadge label="Simulated" />}
                      </div>
                      <p className="mt-1 truncate text-sm">{a.kind.replace("_", " ")} → {a.target}</p>
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
                  <li key={r.experiment_id} className="px-5 py-3">
                    <Link href={`${base}/experiments/${r.experiment_id}`} className="group block">
                      <div className="flex items-center gap-2">
                        <DecisionChip decision={r.decision} />
                        <span className="text-xs text-ink-3">{Math.round(r.confidence * 100)}% confidence</span>
                        {r.includes_demo_data && <DemoBadge label="Demo" />}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium group-hover:text-trail">{r.experiment_title}</p>
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
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {data.recent_outcomes.map((o) => (
              <li key={o.id} className="bg-surface px-5 py-3">
                <p className="text-sm font-medium capitalize">{o.kind.replace(/_/g, " ")}</p>
                <p className="truncate text-xs text-ink-3">{o.experiment_title} · {timeAgo(o.occurred_at)}</p>
                {o.origin === "demo" && <span className="mt-1 inline-block"><DemoBadge label="Demo" /></span>}
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 text-right">
            <Link href={`${base}/experiments/${data.recent_outcomes[0].experiment_id}`} className="inline-flex items-center gap-1 text-xs font-medium text-trail">
              Open latest <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
