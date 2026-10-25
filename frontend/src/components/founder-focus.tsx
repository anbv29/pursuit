"use client";

import { ArrowRight, Bell, Check, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Experiment, ExperimentReminder, FounderFocus } from "@/lib/types";
import { useWorkspace } from "./shell";
import { Badge, Button, Card, CardHeader, Checkbox, DemoBadge, Empty, Field, Input, Notice, Select, Skeleton } from "./ui";

/** Refresh in-app attention when the user returns, and once a minute while visible. */
function useAttentionClock() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setVersion(v => v + 1); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return version;
}

export function FounderFocusCard({ compact = false, refreshKey = 0 }: { compact?: boolean; refreshKey?: number }) {
  const { base, workspace } = useWorkspace();
  const version = useAttentionClock();
  const focus = useApi<FounderFocus>(`/workspaces/${workspace.id}/focus`, `${refreshKey}:${version}`);
  const priorities = focus.data?.priorities ?? [];
  return <Card>
    <CardHeader title="Your next best steps" description="Based on your saved work, with a reason for each suggestion."
      action={compact ? <Link href={`${base}/focus`} className="inline-flex min-h-8 items-center text-sm font-semibold text-trail hover:underline">Your priorities <ArrowRight className="ml-1 size-3.5" aria-hidden /></Link> : undefined} />
    {focus.loading ? <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      : focus.error ? <div className="p-5"><Notice tone="bad">Couldn’t load your priorities. <button onClick={() => void focus.reload()} className="underline">Try again</button></Notice></div>
        : priorities.length === 0 ? <Empty title="Nothing urgent right now" body="Your saved reminders, evidence gaps and new results will surface here." />
          : <ol className="divide-y divide-line">{priorities.slice(0, compact ? 3 : 5).map((p, i) => <li key={p.id}>
            <Link href={p.href} className="group flex min-h-20 items-start gap-3 p-5 transition-colors hover:bg-sunken">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold tabular-nums text-trail">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold group-hover:text-trail">{p.title}</p>{p.urgency === "overdue" && <Badge tone="flag">Overdue</Badge>}{p.is_demo && <DemoBadge label="Demo" />}</div>
                <p className="mt-1 text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{p.reason}</p>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-trail" aria-hidden />
            </Link>
          </li>)}</ol>}
    {!!focus.data?.overdue_count && <p className="border-t border-line px-5 py-3 text-sm text-warning"><Bell className="mr-1.5 inline size-4" aria-hidden />{focus.data.overdue_count} overdue reminder{focus.data.overdue_count === 1 ? "" : "s"}. <Link href={`${base}/focus#reminders`} className="font-semibold underline">Review reminders</Link></p>}
  </Card>;
}

function ReminderRow({ reminder, endpoint, onDone }: { reminder: ExperimentReminder; endpoint: string; onDone: () => Promise<void> }) {
  const { base } = useWorkspace();
  const [error, setError] = useState<string | null>(null);
  const update = useAction(async (change: { completed?: boolean; due_at?: string }) => {
    setError(null);
    try { await api(`${endpoint}/${reminder.id}`, { method: "PATCH", json: change }); await onDone(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const tomorrow = () => {
    const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0);
    void update.run({ due_at: next.toISOString() });
  };
  return <li id={`reminder-${reminder.id}`} className="scroll-mt-28 space-y-3 border-t border-line p-5 first:border-0">
    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{reminder.title}</h3><Badge tone={reminder.completed_at ? "good" : reminder.overdue ? "flag" : "muted"}>{reminder.completed_at ? "Completed" : reminder.overdue ? "Overdue" : "Upcoming"}</Badge>{reminder.is_demo && <DemoBadge label="Demo" />}</div>
    <p className="text-xs text-ink-3 [overflow-wrap:anywhere]"><time dateTime={reminder.due_at}>{new Date(reminder.due_at).toLocaleString()}</time> · <Link href={`${base}/experiments/${reminder.experiment_id}`} className="text-trail hover:underline">{reminder.experiment_title}</Link></p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" loading={update.pending} onClick={() => void update.run({ completed: !reminder.completed_at })} aria-label={`${reminder.completed_at ? "Reopen" : "Complete"} ${reminder.title}`}><Check className="size-3.5" aria-hidden />{reminder.completed_at ? "Reopen" : "Mark complete"}</Button>
      {!reminder.completed_at && <Button size="sm" variant="ghost" disabled={update.pending} onClick={tomorrow} aria-label={`Move ${reminder.title} to tomorrow at 9am`}><Clock3 className="size-3.5" aria-hidden />Tomorrow, 9am</Button>}
    </div>
    {error && <Notice tone="bad">{error}</Notice>}
  </li>;
}

export function RemindersPanel({ experimentId, refreshKey = 0, onChange }: { experimentId?: string; refreshKey?: number; onChange?: () => void }) {
  const { workspace } = useWorkspace();
  const root = `/workspaces/${workspace.id}`;
  const endpoint = `${root}/reminders`;
  const clock = useAttentionClock();
  const reminders = useApi<ExperimentReminder[]>(`${endpoint}?include_completed=true${experimentId ? `&experiment_id=${experimentId}` : ""}`, `${refreshKey}:${clock}`);
  const experiments = useApi<Experiment[]>(experimentId ? null : `${root}/experiments`);
  const [chosen, setChosen] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = experimentId ?? chosen;
  const refresh = async () => { await reminders.reload(); onChange?.(); };
  const save = useAction(async () => {
    setError(null);
    const date = new Date(due);
    if (!selected || !title.trim() || !Number.isFinite(date.getTime())) {
      setError("Choose an experiment, a reminder title and a valid local date and time."); return;
    }
    try {
      await api(endpoint, { json: { experiment_id: selected, title: title.trim(), due_at: date.toISOString() } });
      setTitle(""); setDue("");
      await refresh();
    } catch (e) { setError(errorMessage(e)); }
  });
  const rows = Array.isArray(reminders.data) ? reminders.data.filter(r => showCompleted || !r.completed_at) : [];

  return <Card>
    <CardHeader title="Experiment reminders" description="In-app reminders for follow-ups, results and reviews. Email and push notifications are not sent." />
    <form onSubmit={e => { e.preventDefault(); void save.run(); }} className="space-y-3 border-b border-line p-5">
      {!experimentId && <Field label="Experiment for reminder">{id => <Select id={id} value={chosen} onChange={e => setChosen(e.target.value)} required disabled={experiments.loading || !!experiments.error}>
        <option value="">Choose an experiment</option>{(Array.isArray(experiments.data) ? experiments.data : []).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </Select>}</Field>}
      {experiments.error && <Notice tone="bad">Couldn’t load experiments. <button type="button" className="underline" onClick={() => void experiments.reload()}>Try again</button></Notice>}
      <Field label="Reminder title">{id => <Input id={id} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Record this week’s interview results" required />}</Field>
      <Field label="Due date & time" hint="Uses your local timezone. Past dates are shown as overdue.">{(id, d) => <Input id={id} className="min-w-0" aria-describedby={d} type="datetime-local" value={due} onChange={e => setDue(e.target.value)} required />}</Field>
      {error && <Notice tone="bad">{error}</Notice>}
      <Button type="submit" loading={save.pending} disabled={!selected || !title.trim() || !due}>Set reminder</Button>
    </form>
    <div className="px-5 pt-4"><Checkbox label="Show completed reminders" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /></div>
    {reminders.loading ? <div className="p-5"><Skeleton className="h-24" /></div>
      : reminders.error ? <div className="p-5"><Notice tone="bad">{reminders.error.message} <button className="underline" onClick={() => void reminders.reload()}>Try again</button></Notice></div>
        : !rows.length ? <Empty title={showCompleted ? "No reminders yet" : "No open reminders"} body="Set a date for the next thing you want to check on." />
          : <ul>{rows.map(r => <ReminderRow key={r.id} reminder={r} endpoint={endpoint} onDone={refresh} />)}</ul>}
  </Card>;
}
