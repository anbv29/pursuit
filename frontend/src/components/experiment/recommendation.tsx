"use client";

import { useState } from "react";

import { AlertTriangle, Bot, Compass, ListChecks, Sparkles } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { DECISION_STYLE, timeAgo } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";
import { DecisionChip } from "../bits";
import { useFeedback } from "../feedback";
import { Button, Card, CardHeader, DemoBadge, Empty, Skeleton } from "../ui";
import { useExperiment } from "./context";

function List({ icon: Icon, title, items, tone }: { icon: typeof Compass; title: string; items: string[]; tone?: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${tone ?? "text-ink-3"}`}><Icon className="size-3.5" />{title}</p>
      <ul className="mt-1.5 space-y-1 text-sm text-ink-2">
        {items.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />{t}</li>)}
      </ul>
    </div>
  );
}

export function RecommendationPanel() {
  const { exp, path, reload, version, touch } = useExperiment();
  const { toast } = useFeedback();
  const recs = useApi<Recommendation[]>(`${path}/recommendations`, version);
  const [useAi, setUseAi] = useState(false);

  const generate = useAction(async () => {
    try {
      await api(`${path}/recommendations`, { json: { use_ai: useAi } });
      await Promise.all([recs.reload(), reload()]);
      touch();
      toast("success", "Recommendation generated from current evidence and outcomes.");
    } catch (e) {
      toast("error", errorMessage(e));
    }
  });

  const latest = recs.data?.[0];
  const action = (
    <Button size="sm" variant={latest ? "secondary" : "primary"} loading={generate.pending} onClick={() => generate.run()}>
      <Sparkles className="size-3.5" /> {latest ? "Re-analyse" : "Generate"}
    </Button>
  );

  return (
    <Card>
      <CardHeader title="Recommendation" description="Based only on persisted evidence and outcomes." action={action} />
      <label className="flex items-start gap-2 px-5 py-3 text-sm text-ink-2"><input type="checkbox" className="mt-1" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />Use AI assistance (one AI answer on success). Leave off for free rule-based analysis.</label>
      {recs.loading && !recs.data ? <div className="p-5"><Skeleton className="h-28" /></div>
        : !latest ? (
          <Empty icon={<Compass className="size-4" />} title="No recommendation yet"
            body={generate.pending ? "Analysing… this can take up to a minute when AI synthesis is on." : "Generate one at any time — with little data it will honestly say Inconclusive."} />
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <DecisionChip decision={latest.decision} size="lg" />
              <div>
                <p className="text-sm font-medium">{DECISION_STYLE[latest.decision].blurb}</p>
                <p className="text-xs text-ink-3">
                  {Math.round(latest.confidence * 100)}% confidence · {timeAgo(latest.created_at)} ·{" "}
                  <span className="inline-flex items-center gap-1"><Bot className="size-3" />{latest.generated_by === "rules" ? "rule-based" : latest.generated_by.replace("claude:", "Claude · ")}</span>
                </p>
              </div>
              {latest.includes_demo_data && <DemoBadge />}
            </div>
            <p className="text-sm text-ink">{latest.rationale}</p>
            <div className="rounded-lg bg-trail-soft/60 px-3 py-2.5 text-sm">
              <span className="font-medium text-trail-strong">Next: </span>{latest.next_action}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <List icon={AlertTriangle} title="Counterevidence" tone="text-flag" items={latest.counterevidence.map((c) => c.claim)} />
              <List icon={ListChecks} title="Assumptions" items={latest.assumptions} />
              <List icon={AlertTriangle} title="Limitations" items={latest.limitations} />
            </div>
            <p className="text-xs text-ink-3">Cites {latest.evidence_ids.length} supporting evidence item{latest.evidence_ids.length === 1 ? "" : "s"}. {recs.data && recs.data.length > 1 && `${recs.data.length - 1} earlier recommendation(s) kept in history.`}</p>
          </div>
        )}
      {exp.criteria.length === 0 && <p className="border-t border-line px-5 py-2.5 text-xs text-flag">Add success criteria — without them every verdict is Inconclusive.</p>}
    </Card>
  );
}
