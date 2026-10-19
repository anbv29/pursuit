"use client";

import { useApi } from "@/lib/hooks";
import { timeAgo } from "@/lib/labels";
import type { Analysis, CriterionResult, TimelineItem } from "@/lib/types";
import { KNOWN_METRICS, isRate } from "../criteria-editor";
import { Badge, Card, CardHeader, DemoBadge, Empty, Notice, Skeleton } from "../ui";
import { useExperiment } from "./context";
import { RecommendationPanel } from "./recommendation";

const STATUS: Record<CriterionResult["status"], { label: string; tone: "good" | "bad" | "flag" | "muted" }> = {
  met: { label: "Met", tone: "good" },
  not_met: { label: "Not met", tone: "bad" },
  insufficient_sample: { label: "Too few samples", tone: "flag" },
  no_data: { label: "No data", tone: "muted" },
};

const SYMBOL: Record<string, string> = { ">=": "≥", "<=": "≤", ">": ">", "<": "<" };

const fmt = (metric: string, v: number | null) =>
  v === null ? "—" : isRate(metric) ? `${Math.round(v * 100)}%` : String(Math.round(v * 100) / 100);

export function CriteriaResults() {
  const { path, version } = useExperiment();
  const a = useApi<Analysis>(`${path}/analysis`, version);
  if (!a.data) return <Skeleton className="h-40" />;
  const sim = a.data.metrics.excluded_simulated_outcomes;
  return (
    <Card>
      <CardHeader title="Success criteria" description="Judged only once the minimum sample is reached." />
      {a.data.criteria.length === 0 ? <Empty title="No criteria" body="Define what success looks like before collecting results." /> : (
        <ul className="divide-y divide-line">
          {a.data.criteria.map((c) => (
            <li key={c.criterion_id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{KNOWN_METRICS.find((k) => k.value === c.metric)?.label ?? c.metric}</p>
                <p className="text-xs text-ink-3">
                  Target {SYMBOL[c.comparator] ?? c.comparator} {fmt(c.metric, c.target)} · current <b className="text-ink-2">{fmt(c.metric, c.value)}</b>
                  {" "}· n = {c.sample}{c.sample < c.min_sample && ` of ${c.min_sample} needed`}
                </p>
              </div>
              <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
            </li>
          ))}
        </ul>
      )}
      {Object.keys(sim).length > 0 && (
        <div className="border-t border-line p-3">
          <Notice tone="demo">
            Excluded from these results: {Object.entries(sim).map(([k, n]) => `${n} simulated ${k.replace(/_/g, " ")}`).join(", ")} (demo-mode actions).
          </Notice>
        </div>
      )}
    </Card>
  );
}

export function Timeline() {
  const { path, version } = useExperiment();
  const t = useApi<TimelineItem[]>(`${path}/timeline`, version);
  return (
    <Card>
      <CardHeader title="Activity" />
      {!t.data ? <div className="p-4"><Skeleton className="h-32" /></div> : (
        t.data.length === 0 ? <Empty title="No activity yet" body="Changes to this experiment will appear here." /> : <ol className="max-h-[32rem] space-y-0 overflow-y-auto px-5 py-3">
          {t.data.map((e) => (
            <li key={e.id} className="relative border-l border-line pb-3 pl-4 last:pb-0">
              <span className="absolute -left-[4.5px] top-1.5 size-2 rounded-full bg-line-strong" />
              <p className="text-[13px] text-ink">{describe(e)}</p>
              <p className="text-[11px] text-ink-3">{e.actor_name ?? "Pursuit"} · {timeAgo(e.created_at)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function describe(e: TimelineItem): string {
  const d = e.detail as Record<string, string>;
  const map: Record<string, string> = {
    "experiment.create": "Created the experiment",
    "experiment.update": "Edited details",
    "experiment.stage": `Moved ${d.from} → ${d.to}`,
    "experiment.archive": "Archived the experiment",
    "criterion.add": `Added criterion ${d.metric}`,
    "criterion.delete": `Removed criterion ${d.metric}`,
    "source.add": "Added a research source",
    "evidence.add": `Added ${String(d.stance)} evidence`,
    "evidence.delete": "Removed evidence",
    "prospect.add": `Added prospect ${d.name ?? ""}`,
    "prospect.update": "Updated a prospect",
    "interview.save": `Saved interview (${d.status})`,
    "variant.add": `Added message variant ${d.label}`,
    "outcome.record": `Recorded ${String(d.kind).replace(/_/g, " ")}${d.origin === "demo" ? " (demo)" : ""}`,
    "action.request": `Requested ${String(d.kind).replace("_", " ")} (${d.mode})`,
    "action.approve": "Approved an action",
    "action.reject": "Rejected an action",
    "action.cancel": "Cancelled an action",
    "action.result": `Action finished: ${d.status}`,
    "action.confirm": `Confirmed action outcome: ${String(d.succeeded) === "true" ? "succeeded" : "failed"}`,
    "recommendation.generate": `Recommendation: ${d.decision}`,
    "funnel.save": `Saved funnel data (${d.stages} stages)`,
  };
  return map[e.action] ?? e.action;
}

export function Overview() {
  const { exp } = useExperiment();
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-ink-3">Hypothesis</p>
            {exp.is_demo && <DemoBadge />}
          </div>
          <p className="mt-2 text-[17px] leading-relaxed">{exp.hypothesis}</p>
          {exp.target_audience && <p className="mt-2 text-sm text-ink-3">Audience: {exp.target_audience}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
            {Object.entries(exp.counts).filter(([, n]) => n > 0).map(([k, n]) => (
              <div key={k}><dt className="inline text-ink-3 capitalize">{k} </dt><dd className="inline font-medium tabular-nums">{n}</dd></div>
            ))}
          </dl>
        </Card>
        <RecommendationPanel />
        <CriteriaResults />
      </div>
      <Timeline />
    </div>
  );
}
