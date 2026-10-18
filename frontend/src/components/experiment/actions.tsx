"use client";

import { Mail, CalendarClock, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { ACTION_STATUS, timeAgo } from "@/lib/labels";
import type { Action, Prospect, Template, Variant } from "@/lib/types";
import { useFeedback } from "../feedback";
import { useWorkspace } from "../shell";
import { Badge, Button, Card, CardHeader, DemoBadge, Empty, Field, Input, Notice, Select, Skeleton, Textarea } from "../ui";
import { useExperiment } from "./context";

const ICON = { send_email: Mail, schedule_meeting: CalendarClock, research_task: Search };
const KIND_LABEL = { send_email: "Send email", schedule_meeting: "Schedule meeting", research_task: "Research task" };

function RequestForm({ kinds, onDone }: { kinds: Action["kind"][]; onDone: () => void }) {
  const { path, touch } = useExperiment();
  const { toast } = useFeedback();
  const prospects = useApi<Prospect[]>(`${path}/prospects`);
  const variants = useApi<Variant[]>(`${path}/variants`);
  const [kind, setKind] = useState<Action["kind"]>(kinds[0]);
  const [f, setF] = useState({ target: "", subject: "", body: "", title: "Customer conversation", window: "in the next 7 days", duration_minutes: 30, note: "", question: "", prospect_id: "", variant_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const pickVariant = (id: string) => {
    const v = variants.data?.find((x) => x.id === id);
    setF((s) => ({ ...s, variant_id: id, ...(v ? { subject: v.subject, body: v.body } : {}) }));
  };
  const pickProspect = (id: string) => {
    const p = prospects.data?.find((x) => x.id === id);
    setF((s) => ({ ...s, prospect_id: id, ...(p?.email && !p.email.includes("***") ? { target: p.email } : {}) }));
  };

  const submit = useAction(async () => {
    setErr(null);
    setErrors({});
    const payload =
      kind === "send_email" ? { subject: f.subject, body: f.body }
        : kind === "schedule_meeting" ? { title: f.title, window: f.window, duration_minutes: f.duration_minutes, note: f.note }
          : { question: f.question };
    try {
      await api(`${path}/actions`, { json: { kind, target: f.target, payload, prospect_id: f.prospect_id || null, variant_id: f.variant_id || null } });
      toast("success", "Action requested. It will not run until approved.");
      setF((s) => ({ ...s, target: "", prospect_id: "" }));
      onDone();
      touch();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setErr(errorMessage(e));
    }
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void submit.run(); }} className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Action type">
        {kinds.map((k) => {
          const I = ICON[k];
          return (
            <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${kind === k ? "border-trail bg-trail-soft text-trail-strong" : "border-line hover:border-line-strong"}`}>
              <I className="size-3.5" /> {KIND_LABEL[k]}
            </button>
          );
        })}
      </div>
      {kind !== "research_task" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Prospect (optional)">{(id) => (
            <Select id={id} value={f.prospect_id} onChange={(e) => pickProspect(e.target.value)}>
              <option value="">—</option>{prospects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}{p.company && ` · ${p.company}`}</option>)}
            </Select>)}</Field>
          <Field label="Recipient email" error={errors.email ?? errors.target}>{(id, d) => <Input id={id} type="email" aria-describedby={d} value={f.target} onChange={set("target")} placeholder="one recipient only" />}</Field>
        </div>
      )}
      {kind === "send_email" && (
        <>
          {variants.data && variants.data.length > 0 && (
            <Field label="Message variant">{(id) => (
              <Select id={id} value={f.variant_id} onChange={(e) => pickVariant(e.target.value)}>
                <option value="">Write a one-off message</option>{variants.data!.map((v) => <option key={v.id} value={v.id}>Variant {v.label}: {v.subject}</option>)}
              </Select>)}</Field>
          )}
          <Field label="Subject" error={errors.subject}>{(id) => <Input id={id} value={f.subject} onChange={set("subject")} />}</Field>
          <Field label="Body" error={errors.body}>{(id) => <Textarea id={id} rows={5} value={f.body} onChange={set("body")} />}</Field>
        </>
      )}
      {kind === "schedule_meeting" && (
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Title">{(id) => <Input id={id} value={f.title} onChange={set("title")} />}</Field>
          <Field label="When">{(id) => <Input id={id} value={f.window} onChange={set("window")} />}</Field>
          <Field label="Minutes">{(id) => <Input id={id} type="number" min={15} max={120} value={f.duration_minutes} onChange={set("duration_minutes")} />}</Field>
          <div className="md:col-span-3"><Field label="Invite note">{(id) => <Textarea id={id} rows={2} value={f.note} onChange={set("note")} />}</Field></div>
        </div>
      )}
      {kind === "research_task" && (
        <Field label="Research question" error={errors.question} hint="Fo reads public information only; it won't contact anyone.">
          {(id) => <Textarea id={id} rows={3} value={f.question} onChange={set("question")} />}</Field>
      )}
      {err && <Notice tone="bad">{err}</Notice>}
      <Button type="submit" loading={submit.pending}>Request approval</Button>
    </form>
  );
}

function ActionRow({ a, onChange }: { a: Action; onChange: () => void }) {
  const { path, touch } = useExperiment();
  const { refreshApprovals } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const st = ACTION_STATUS[a.status];
  const I = ICON[a.kind];

  const call = useAction(async (suffix: string, json: unknown, ok: string) => {
    try {
      await api(`${path}/actions/${a.id}/${suffix}`, { json });
      toast("success", ok);
    } catch (e) {
      toast("error", errorMessage(e));
    }
    onChange();
    touch();
    refreshApprovals();
  });

  const approve = async () => {
    const ok = await confirm({
      title: a.mode === "live" ? "Approve a real action?" : "Approve simulated action?",
      confirm: a.mode === "live" ? "Approve and send via Fo" : "Approve (demo)",
      danger: a.mode === "live",
      body: (
        <div className="space-y-2">
          {a.mode === "live"
            ? <Notice tone="flag">Fo will act from your real account. This can't be undone once sent.</Notice>
            : <Notice tone="demo">Demo mode: nothing will actually be sent.</Notice>}
          <p><b>{KIND_LABEL[a.kind]}</b> → {a.target}</p>
          {"subject" in a.payload && <p className="text-ink-3">Subject: {String(a.payload.subject)}</p>}
          {"body" in a.payload && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-2 font-sans text-xs">{String(a.payload.body)}</pre>}
          {"question" in a.payload && <p className="text-ink-3">{String(a.payload.question)}</p>}
        </div>
      ),
    });
    if (ok) void call.run("decision", { decision: "approve" }, "Approved. Queued for execution.");
  };

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <I className="size-4 text-ink-3" aria-hidden />
        <span className="text-sm font-medium">{KIND_LABEL[a.kind]}</span>
        <span className="truncate text-sm text-ink-2">→ {a.target}</span>
        <Badge tone={st.tone} title={st.help}>{st.label}</Badge>
        {a.mode === "demo" ? <DemoBadge label="Simulated" /> : <Badge tone="trail">Live · Fo</Badge>}
        <span className="ml-auto text-xs text-ink-3">{timeAgo(a.created_at)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-3">{st.help}</p>
      {a.result_summary && <p className="mt-1.5 rounded-md bg-sunken px-2 py-1.5 text-xs text-ink-2">Fo: {a.result_summary}</p>}
      {a.error && <p className="mt-1.5 rounded-md bg-flag-soft px-2 py-1.5 text-xs text-d-stop">{a.error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {a.status === "PENDING_APPROVAL" && <>
          <Button size="sm" onClick={approve} loading={call.pending}>Review & approve</Button>
          <Button size="sm" variant="secondary" disabled={call.pending} onClick={() => call.run("decision", { decision: "reject" }, "Rejected.")}>Reject</Button>
        </>}
        {(a.status === "PENDING_APPROVAL" || a.status === "QUEUED") &&
          <Button size="sm" variant="ghost" disabled={call.pending} onClick={() => call.run("cancel", {}, "Cancelled.")}>Cancel</Button>}
        {a.status === "UNKNOWN" && <>
          <span className="flex items-center gap-1 text-xs text-flag"><ShieldAlert className="size-3.5" /> Check your inbox/calendar, then confirm:</span>
          <Button size="sm" variant="secondary" disabled={call.pending} onClick={() => call.run("confirm", { outcome: "succeeded" }, "Marked as succeeded.")}>It happened</Button>
          <Button size="sm" variant="danger" disabled={call.pending} onClick={() => call.run("confirm", { outcome: "failed" }, "Marked as failed.")}>It didn't</Button>
        </>}
      </div>
    </li>
  );
}

export function ActionsPanel() {
  const { exp, path, version } = useExperiment();
  const tpl = useApi<Template[]>("/use-cases");
  const list = useApi<Action[]>(`${path}/actions`);
  const { reload } = list;
  useEffect(() => { void reload(); }, [version, reload]);
  const inFlight = list.data?.some((a) => a.status === "QUEUED" || a.status === "RUNNING");
  useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(() => void reload(), 2500);
    return () => clearInterval(t);
  }, [inFlight, reload]);

  const kinds = [...((tpl.data?.find((t) => t.use_case === exp.use_case)?.actions ?? []) as Action["kind"][]), "research_task" as const];

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader title="Request an action" description="Runs through Fo only after explicit approval." />
        {tpl.data ? <RequestForm kinds={kinds} onDone={reload} /> : <div className="p-4"><Skeleton className="h-40" /></div>}
      </Card>
      <Card className="xl:col-span-3">
        <CardHeader title="Actions" description="Queued ≠ sent. Live results stay unconfirmed until you check them." />
        {list.loading && !list.data ? <div className="p-4"><Skeleton className="h-32" /></div>
          : !list.data?.length ? <Empty title="No actions yet" body="Request outreach, a meeting, or a research task. Nothing runs without approval." />
            : <ul className="divide-y divide-line">{list.data.map((a) => <ActionRow key={a.id} a={a} onChange={reload} />)}</ul>}
      </Card>
    </div>
  );
}
