"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Analysis, Variant } from "@/lib/types";
import { IntervalBar, RateView } from "../bits";
import { Button, Card, CardHeader, Empty, Field, Input, Notice, Textarea } from "../ui";
import { useExperiment } from "./context";

/** Conservative read of two rates: overlapping 95% intervals = not distinguishable. */
function verdict(a: Analysis["metrics"]["variants"], minSample: number): string {
  if (a.length < 2) return "Add at least two variants to compare.";
  const small = a.filter((v) => v.sent < minSample);
  if (small.length) return `Not enough data: ${small.map((v) => `${v.label} has ${v.sent}/${minSample} sends`).join(", ")}. Any difference so far could be noise.`;
  const [x, y] = [...a].sort((p, q) => (q.positive_reply.value ?? 0) - (p.positive_reply.value ?? 0));
  if ((x.positive_reply.ci_low ?? 0) > (y.positive_reply.ci_high ?? 1)) return `Variant ${x.label} is clearly ahead (95% intervals don't overlap).`;
  return `Variant ${x.label} leads, but the intervals overlap — not distinguishable yet.`;
}

export function MessagingPanel() {
  const { exp, path, version, touch } = useExperiment();
  const variants = useApi<Variant[]>(`${path}/variants`);
  const analysis = useApi<Analysis>(`${path}/analysis`, version);
  const [f, setF] = useState({ label: "", subject: "", body: "", angle: "" });
  const [err, setErr] = useState<string | null>(null);
  const add = useAction(async () => {
    try {
      await api(`${path}/variants`, { json: f });
      setF({ label: "", subject: "", body: "", angle: "" });
      setErr(null);
      await variants.reload();
      touch();
    } catch (e) {
      setErr(errorMessage(e));
    }
  });

  const stats = analysis.data?.metrics.variants ?? [];
  const minSample = exp.criteria.find((c) => c.metric === "positive_reply_rate")?.min_sample ?? 30;
  const target = exp.criteria.find((c) => c.metric === "positive_reply_rate")?.target;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Variant comparison" description="Positive replies ÷ messages actually recorded as sent." />
        {!variants.data?.length ? <Empty title="No variants yet" body="Write two or more messages with different angles below." /> : (
          <>
            <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
              {variants.data.map((v) => {
                const s = stats.find((x) => x.variant_id === v.id);
                return (
                  <div key={v.id} className="bg-surface p-5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-md bg-ink text-sm font-semibold text-white">{v.label}</span>
                      <p className="truncate font-medium">{v.subject || v.angle || "Untitled"}</p>
                    </div>
                    {v.angle && <p className="mt-1 text-xs text-ink-3">Angle: {v.angle}</p>}
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-[13px] text-ink-2">{v.body}</p>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-ink-3">Sent</dt><dd className="tabular-nums">{s?.sent ?? 0}</dd></div>
                      <div className="flex justify-between"><dt className="text-ink-3">Delivered</dt><dd className="tabular-nums">{s?.delivered || "not reported"}</dd></div>
                      <div><dt className="text-ink-3">Reply rate</dt><dd>{s ? <RateView rate={s.reply} /> : "—"}</dd></div>
                      <div><dt className="text-ink-3">Positive reply rate</dt><dd>{s ? <RateView rate={s.positive_reply} /> : "—"}</dd></div>
                      {s && <IntervalBar rate={s.positive_reply} target={target} />}
                      <div className="flex justify-between"><dt className="text-ink-3">Meetings</dt><dd className="tabular-nums">{s?.meetings ?? 0}</dd></div>
                    </dl>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line p-4"><Notice tone="trail">{verdict(stats, minSample)}</Notice></div>
          </>
        )}
      </Card>
      <Card>
        <CardHeader title="Add a variant" />
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void add.run(); }} className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="Label">{(id) => <Input id={id} maxLength={40} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="A" />}</Field>
          <div className="md:col-span-3"><Field label="Angle">{(id) => <Input id={id} value={f.angle} onChange={(e) => setF({ ...f, angle: e.target.value })} placeholder="Cost savings" />}</Field></div>
          <div className="md:col-span-4"><Field label="Subject">{(id) => <Input id={id} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />}</Field></div>
          <div className="md:col-span-4"><Field label="Body">{(id) => <Textarea id={id} rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />}</Field></div>
          {err && <div className="md:col-span-4"><Notice tone="bad">{err}</Notice></div>}
          <div><Button type="submit" loading={add.pending} disabled={!f.label || !f.body}>Add variant</Button></div>
        </form>
      </Card>
    </div>
  );
}
