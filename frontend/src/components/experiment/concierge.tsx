"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { Prospect } from "@/lib/types";
import { useWorkspace } from "../shell";
import { useFeedback } from "../feedback";
import { Button, Card, CardHeader, Empty, Field, Input, Notice, Select, Textarea } from "../ui";
import { useExperiment } from "./context";

export function InterviewConcierge({ prospects }: { prospects: Prospect[] }) {
  const { path, exp, touch } = useExperiment();
  const { workspace, base, refreshApprovals } = useWorkspace();
  const { toast } = useFeedback();
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "Could we learn how you handle this today?",
    invitation: "Hi, I am researching how teams handle this problem today. Would you be open to a 30-minute conversation about your experience? This is a research interview, not a sales pitch.",
    title: "Customer discovery interview", window: "", deadline: "", timezone: "Asia/Kolkata",
    duration_minutes: 30, max_followups: 0 });
  const eligible = prospects.filter((p) => p.email && !p.email.includes("***") && p.status !== "declined");
  const chosen = eligible.filter((p) => selected.includes(p.id));
  const submit = useAction(async () => {
    try {
      await api(`${path}/concierge`, { json: { ...form, prospect_ids: selected,
        deadline: new Date(form.deadline).toISOString() } });
      setCreated(true); setReview(false); setSelected([]); setError(null);
      touch(); refreshApprovals(); toast("success", "Invitations are waiting for individual approval.");
    } catch (e) {
      setError(e instanceof ApiError && e.fields ? Object.values(e.fields).join(" ") : errorMessage(e));
    }
  });
  if (workspace.role !== "owner" || !["problem_discovery", "segment_validation", "willingness_to_pay"].includes(exp.use_case)) return null;
  const edit = (key: "subject" | "invitation" | "title" | "window" | "deadline" | "timezone") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((f) => ({ ...f, [key]: e.target.value })); setReview(false); };
  const preview = (e: FormEvent) => { e.preventDefault(); setError(null); if (chosen.length) setReview(true); };

  return <Card>
    <CardHeader title="Interview concierge" description="Pick up to five people. Review an invitation for each, then let Fo help arrange a conversation." />
    <div className="space-y-4 p-4 pt-0">
      <p className="text-sm text-ink-2">Fo can exchange scheduling messages within your approved limits. A reported booking needs your confirmation; attendance and interview findings are recorded separately.</p>
      {!eligible.length ? <Empty title="Add a prospect with an email first" body="Use the prospect form below. People who declined contact cannot be selected." /> :
        <form onSubmit={preview} className="space-y-4">
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Who would you like to interview? ({selected.length}/5)</legend>
            {eligible.map((p) => <label key={p.id} className="flex min-h-10 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" checked={selected.includes(p.id)} disabled={submit.pending || (!selected.includes(p.id) && selected.length >= 5)}
                onChange={(e) => { setSelected((s) => e.target.checked ? [...s, p.id] : s.filter((id) => id !== p.id)); setReview(false); }} />
              <span className="min-w-0 break-words"><b>{p.name}</b>{p.company && ` · ${p.company}`}<span className="block text-ink-3">{p.email}</span></span>
            </label>)}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Interview title">{(id) => <Input id={id} required minLength={3} maxLength={200} value={form.title} onChange={edit("title")} />}</Field>
            <Field label="Interview length (minutes)">{(id) => <Input id={id} required type="number" min={15} max={60} value={form.duration_minutes} onChange={(e) => { setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) })); setReview(false); }} />}</Field>
            <Field label="Available times" hint="Include dates and hours, for example Nov 2–6, 2–5 pm.">{(id) => <Input id={id} required minLength={5} maxLength={200} value={form.window} onChange={edit("window")} />}</Field>
            <Field label="Scheduling timezone">{(id) => <Input id={id} required maxLength={100} value={form.timezone} onChange={edit("timezone")} placeholder="Asia/Kolkata" />}</Field>
            <Field label="Stop coordination by" hint="Within 14 days. Enter this deadline in your device's local timezone.">{(id) => <Input id={id} required type="datetime-local" value={form.deadline} onChange={edit("deadline")} />}</Field>
            <Field label="Reminder permission">{(id) => <Select id={id} value={form.max_followups} onChange={(e) => { setForm((f) => ({ ...f, max_followups: Number(e.target.value) })); setReview(false); }}>
              <option value={0}>No reminders</option><option value={1}>At most one, after 48 hours without a reply</option>
            </Select>}</Field>
          </div>
          <Field label="Invitation subject">{(id) => <Input id={id} required minLength={3} maxLength={200} value={form.subject} onChange={edit("subject")} />}</Field>
          <Field label="Invitation message">{(id) => <Textarea id={id} required minLength={10} maxLength={2000} rows={4} value={form.invitation} onChange={edit("invitation")} />}</Field>
          <Button type="submit" disabled={!chosen.length || submit.pending}>Review invitations</Button>
          {review && <section aria-label="Invitation preview" className="space-y-3 border-t border-line pt-4">
            <h3 className="font-medium">Review before requesting approval</h3>
            <p className="break-words text-sm">To: {chosen.map((p) => `${p.name} (${p.email})`).join(", ")}</p>
            <p className="text-sm">{form.duration_minutes} minutes · {form.window} · {form.timezone}</p>
            <p className="text-sm">Stop: {new Date(form.deadline).toLocaleString()} · Reminders: {form.max_followups}</p>
            <p className="font-medium">{form.subject}</p><p className="whitespace-pre-wrap text-sm">{form.invitation}</p>
            <Notice>Each person gets a separate approval request. Nothing is sent from this screen.</Notice>
            <Button loading={submit.pending} onClick={() => submit.run()}>Request {chosen.length} approval{chosen.length === 1 ? "" : "s"}</Button>
          </section>}
        </form>}
      {error && <Notice tone="bad">{error}</Notice>}
      {created && <Link href={`${base}/experiments/${exp.id}?tab=actions`} className="inline-block text-sm font-medium text-trail underline">Review interview approvals</Link>}
    </div>
  </Card>;
}
