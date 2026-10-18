"use client";

import { UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Analysis, Interview, Prospect } from "@/lib/types";
import { RateView } from "../bits";
import { useFeedback } from "../feedback";
import { Badge, Button, Card, CardHeader, DemoBadge, Empty, Field, Input, Notice, Select, Textarea } from "../ui";
import { useExperiment } from "./context";

const STATUSES = ["identified", "contacted", "replied", "scheduled", "interviewed", "declined"];

function ProspectForm({ onDone }: { onDone: () => void }) {
  const { path, touch } = useExperiment();
  const empty = { name: "", company: "", role: "", email: "", segment: "", source_url: "", context: "" };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = useAction(async () => {
    try {
      await api(`${path}/prospects`, { json: { ...f, email: f.email || null, source_url: f.source_url || null } });
      setF(empty);
      setErrors({});
      onDone();
      touch();
    } catch (e) {
      setErrors(e instanceof ApiError && e.fields ? e.fields : { form: errorMessage(e) });
    }
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run.run(); }} className="grid gap-3 p-4 sm:grid-cols-2">
      <Field label="Name" error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={set("name")} required />}</Field>
      <Field label="Company">{(id) => <Input id={id} value={f.company} onChange={set("company")} />}</Field>
      <Field label="Role">{(id) => <Input id={id} value={f.role} onChange={set("role")} />}</Field>
      <Field label="Email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={set("email")} />}</Field>
      <Field label="Segment">{(id) => <Input id={id} value={f.segment} onChange={set("segment")} placeholder="e.g. Multi-payer clinics" />}</Field>
      <Field label="Where you found them" error={errors.source_url} hint="URL for provenance">{(id) => <Input id={id} type="url" value={f.source_url} onChange={set("source_url")} />}</Field>
      {errors.form && <div className="sm:col-span-2"><Notice tone="bad">{errors.form}</Notice></div>}
      <div className="sm:col-span-2"><Button type="submit" loading={run.pending} disabled={!f.name}><UserPlus className="size-3.5" /> Add prospect</Button></div>
    </form>
  );
}

function InterviewForm({ prospects, onDone }: { prospects: Prospect[]; onDone: () => void }) {
  const { path, touch } = useExperiment();
  const empty = { prospect_id: "", status: "completed", pain_points: "", current_solution: "", frequency: "", cost_of_problem: "", budget_owner: "", wtp_signal: "none", contradictions: "", notes: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const run = useAction(async () => {
    try {
      await api(`${path}/interviews`, {
        json: { ...f, prospect_id: f.prospect_id || null, pain_points: f.pain_points.split("\n").map((s) => s.trim()).filter(Boolean) },
      });
      setF(empty);
      setErr(null);
      onDone();
      touch();
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run.run(); }} className="grid gap-3 p-4 md:grid-cols-2">
      <Field label="Prospect">{(id) => <Select id={id} value={f.prospect_id} onChange={set("prospect_id")}><option value="">Unlinked</option>{prospects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
      <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={set("status")}><option value="completed">Completed</option><option value="planned">Planned</option><option value="no_show">No-show</option></Select>}</Field>
      <div className="md:col-span-2"><Field label="Pain points" hint="One per line. Record what they did, not what they'd hypothetically do.">{(id) => <Textarea id={id} rows={2} value={f.pain_points} onChange={set("pain_points")} />}</Field></div>
      <Field label="How they solve it today">{(id) => <Input id={id} value={f.current_solution} onChange={set("current_solution")} />}</Field>
      <Field label="How often">{(id) => <Input id={id} value={f.frequency} onChange={set("frequency")} placeholder="weekly" />}</Field>
      <Field label="What it costs them">{(id) => <Input id={id} value={f.cost_of_problem} onChange={set("cost_of_problem")} placeholder="6 hrs/week" />}</Field>
      <Field label="Budget owner">{(id) => <Input id={id} value={f.budget_owner} onChange={set("budget_owner")} />}</Field>
      <Field label="Willingness to pay" hint="A commitment is an LOI, deposit or paid pilot.">{(id) => (
        <Select id={id} value={f.wtp_signal} onChange={set("wtp_signal")}><option value="none">No signal</option><option value="verbal">Verbal interest only</option><option value="commitment">Real commitment</option></Select>)}</Field>
      <Field label="Contradictions">{(id) => <Input id={id} value={f.contradictions} onChange={set("contradictions")} placeholder="Anything that cut against the hypothesis" />}</Field>
      <div className="md:col-span-2"><Field label="Notes">{(id) => <Textarea id={id} rows={3} value={f.notes} onChange={set("notes")} />}</Field></div>
      {err && <div className="md:col-span-2"><Notice tone="bad">{err}</Notice></div>}
      <div><Button type="submit" loading={run.pending}>Save interview</Button></div>
    </form>
  );
}

export function DiscoveryPanel() {
  const { path, version, touch } = useExperiment();
  const { toast } = useFeedback();
  const prospects = useApi<Prospect[]>(`${path}/prospects`);
  const interviews = useApi<Interview[]>(`${path}/interviews`);
  const analysis = useApi<Analysis>(`${path}/analysis`, version);
  const name = (id: string | null) => prospects.data?.find((p) => p.id === id)?.name ?? "Unlinked";

  const setStatus = async (p: Prospect, status: string) => {
    try {
      await api(`${path}/prospects/${p.id}`, { method: "PATCH", json: { status } });
      await prospects.reload();
      touch();
    } catch (e) {
      toast("error", errorMessage(e));
    }
  };
  const m = analysis.data?.metrics;

  return (
    <div className="space-y-6">
      {m && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-ink-3">Interviews completed</p><p className="mt-1 text-2xl font-semibold tabular-nums">{m.interviews_completed}</p></Card>
          <Card className="p-4"><p className="text-xs text-ink-3">Problem confirmed</p><div className="mt-1"><RateView rate={m.problem_confirmed} /></div></Card>
          <Card className="p-4"><p className="text-xs text-ink-3">Budget owner known</p><div className="mt-1"><RateView rate={m.budget_owner_identified} /></div></Card>
          <Card className="p-4"><p className="text-xs text-ink-3">Willingness to pay</p><p className="mt-1 text-sm"><b className="text-lg tabular-nums">{m.commitments}</b> commitments · <span className="text-ink-3">{m.verbal_interest} verbal only</span></p></Card>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={`Prospects (${prospects.data?.length ?? 0})`} description="Contact details are visible to workspace owners only." />
          {!prospects.data?.length ? <Empty icon={<Users className="size-4" />} title="No prospects yet" body="Add people who match your target audience, with where you found them." /> : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {prospects.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name} {p.origin === "demo" && <DemoBadge label="Demo" />}</p>
                    <p className="truncate text-xs text-ink-3">{[p.role, p.company, p.segment].filter(Boolean).join(" · ")}{p.email && ` · ${p.email}`}</p>
                    {p.source_url && <a href={p.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-[11px] text-ink-3 hover:text-trail">source</a>}
                  </div>
                  <Select aria-label={`Status for ${p.name}`} className="h-8 w-32 text-xs" value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line"><ProspectForm onDone={prospects.reload} /></div>
        </Card>
        <Card>
          <CardHeader title={`Interviews (${interviews.data?.length ?? 0})`} description="Behaviour-based: what happened, how often, what it costs." />
          {interviews.data && interviews.data.length > 0 && (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {interviews.data.map((iv) => (
                <li key={iv.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{name(iv.prospect_id)}</span>
                    <Badge tone={iv.status === "completed" ? "good" : "muted"}>{iv.status}</Badge>
                    {iv.wtp_signal !== "none" && <Badge tone={iv.wtp_signal === "commitment" ? "trail" : "neutral"}>{iv.wtp_signal}</Badge>}
                    {iv.origin === "demo" && <DemoBadge label="Demo" />}
                  </div>
                  {iv.pain_points.length > 0 && <p className="mt-1 text-ink-2">Pain: {iv.pain_points.join("; ")}</p>}
                  <p className="text-xs text-ink-3">{[iv.current_solution && `Today: ${iv.current_solution}`, iv.frequency, iv.cost_of_problem, iv.budget_owner && `Budget: ${iv.budget_owner}`].filter(Boolean).join(" · ")}</p>
                  {iv.contradictions && <p className="mt-1 text-xs text-flag">Contradiction: {iv.contradictions}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line"><InterviewForm prospects={prospects.data ?? []} onDone={interviews.reload} /></div>
        </Card>
      </div>
    </div>
  );
}
