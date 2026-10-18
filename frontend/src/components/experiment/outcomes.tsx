"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { timeAgo } from "@/lib/labels";
import type { Outcome, Prospect, Variant } from "@/lib/types";
import { useFeedback } from "../feedback";
import { Badge, Button, Card, CardHeader, DemoBadge, Empty, Field, Input, Notice, Select } from "../ui";
import { useExperiment } from "./context";

const KINDS: [string, string][] = [
  ["sent", "Message sent"], ["delivered", "Delivered"], ["replied", "Replied"], ["positive_reply", "Positive reply"],
  ["meeting_booked", "Meeting booked"], ["interview_completed", "Interview completed"], ["pricing_feedback", "Pricing feedback"],
  ["verbal_interest", "Verbal interest"], ["commitment", "Commitment (LOI / deposit / paid pilot)"], ["custom", "Other"],
];
const label = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;

export function OutcomesPanel() {
  const { path, version, touch } = useExperiment();
  const { confirm, toast } = useFeedback();
  const list = useApi<Outcome[]>(`${path}/outcomes`);
  const variants = useApi<Variant[]>(`${path}/variants`);
  const prospects = useApi<Prospect[]>(`${path}/prospects`);
  const { reload } = list;
  useEffect(() => { void reload(); }, [version, reload]);
  const [f, setF] = useState({ kind: "replied", variant_id: "", prospect_id: "", value: "", note: "" });
  const [err, setErr] = useState<string | null>(null);

  const record = useAction(async () => {
    try {
      await api(`${path}/outcomes`, {
        json: { kind: f.kind, variant_id: f.variant_id || null, prospect_id: f.prospect_id || null, value: f.value === "" ? null : Number(f.value), note: f.note },
      });
      setF((s) => ({ ...s, value: "", note: "" }));
      setErr(null);
      await reload();
      touch();
      toast("success", `Recorded: ${label(f.kind)}.`);
    } catch (e) {
      setErr(errorMessage(e));
    }
  });

  const remove = async (o: Outcome) => {
    if (!(await confirm({ title: "Delete this outcome?", body: "Metrics and criteria will be recalculated without it.", confirm: "Delete", danger: true }))) return;
    await api(`${path}/outcomes/${o.id}`, { method: "DELETE" });
    await reload();
    touch();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader title="Record an outcome" description="Log what really happened. These events drive every metric." />
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void record.run(); }} className="space-y-3 p-4">
          <Field label="What happened">{(id) => <Select id={id} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
          {!!variants.data?.length && (
            <Field label="Variant">{(id) => <Select id={id} value={f.variant_id} onChange={(e) => setF({ ...f, variant_id: e.target.value })}><option value="">—</option>{variants.data!.map((v) => <option key={v.id} value={v.id}>Variant {v.label}</option>)}</Select>}</Field>
          )}
          {!!prospects.data?.length && (
            <Field label="Prospect">{(id) => <Select id={id} value={f.prospect_id} onChange={(e) => setF({ ...f, prospect_id: e.target.value })}><option value="">—</option>{prospects.data!.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
          )}
          {(f.kind === "commitment" || f.kind === "pricing_feedback") && (
            <Field label="Amount ($)" hint="Committed or quoted amount, if any.">{(id) => <Input id={id} type="number" min={0} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />}</Field>
          )}
          <Field label="Note">{(id) => <Input id={id} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />}</Field>
          {err && <Notice tone="bad">{err}</Notice>}
          <Button type="submit" loading={record.pending}>Record outcome</Button>
        </form>
      </Card>
      <Card className="xl:col-span-3">
        <CardHeader title={`Outcome log (${list.data?.length ?? 0})`} />
        {!list.data?.length ? <Empty title="No outcomes yet" body="Outcomes from approved actions and anything you record manually appear here." /> : (
          <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
            {[...list.data].reverse().map((o) => (
              <li key={o.id} className="group flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1">{label(o.kind)}{o.value !== null && ` · $${o.value}`}{o.note && <span className="text-ink-3"> — {o.note}</span>}</span>
                {o.origin === "demo" ? <DemoBadge label="Demo" /> : <Badge tone={o.origin === "fo" ? "trail" : "neutral"}>{o.origin}</Badge>}
                <span className="w-16 text-right text-xs text-ink-3">{timeAgo(o.occurred_at)}</span>
                <button onClick={() => remove(o)} aria-label="Delete outcome" className="text-ink-3 opacity-0 hover:text-d-stop focus:opacity-100 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
