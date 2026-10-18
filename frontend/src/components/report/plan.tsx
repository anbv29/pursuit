"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Empty, Notice, Textarea } from "../ui";
import { Section } from "./parts";

type Task = { id: string; payload: { day: number; title: string; goal: string; steps: string[]; completion: string; done: boolean; notes: string } };

function TaskRow({ task, path, refresh }: { task: Task; path: string; refresh: () => void }) {
  const [notes, setNotes] = useState(task.payload.notes);
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async (done: boolean) => {
    try { await api(`${path}/plan/${task.id}`, { method: "PATCH", json: { done, notes } }); setError(null); refresh(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const t = task.payload;
  return <li className="border-b border-line py-4 last:border-0">
    <label className="flex items-start gap-3 font-medium"><input type="checkbox" className="mt-1" checked={t.done} disabled={save.pending} onChange={(e) => save.run(e.target.checked)} />Day {t.day}: {t.title}</label>
    <p className="mt-2 text-sm text-ink-2">{t.goal}</p>
    <details className="mt-2 text-sm"><summary className="cursor-pointer text-trail">Steps, examples and notes</summary>
      <ol className="my-3 list-decimal space-y-1 pl-5">{t.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
      <p className="my-2 text-xs text-ink-3">Done when: {t.completion}</p>
      <Textarea aria-label={`Notes for day ${t.day}`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} />
      <Button size="sm" variant="secondary" className="mt-2" loading={save.pending} onClick={() => save.run(t.done)}>Save notes</Button>
    </details>
    {error && <Notice tone="bad">{error}</Notice>}
  </li>;
}

export function ReportPlan({ path }: { path: string }) {
  const list = useApi<Task[]>(`${path}/plan`);
  const [error, setError] = useState<string | null>(null);
  const create = useAction(async () => {
    try { await api(`${path}/plan`, { method: "POST" }); await list.reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <Section id="plan" title="Your first week">
    <p className="text-sm text-ink-2">A practical checklist based on this report. Checkmarks record your progress, not validated customer results.</p>
    {list.data?.length ? <><p className="mt-3 text-sm">{list.data.filter((t) => t.payload.done).length} of 7 days completed</p>
      <ol>{list.data.map((task) => <TaskRow key={task.id} task={task} path={path} refresh={list.reload} />)}</ol></>
      : <Empty title="Turn the report into a week of action" body="Create seven manageable tasks, including interview questions and clear completion criteria. No extra AI call is needed."
          action={<Button loading={create.pending} onClick={() => create.run()}>Create my first-week plan</Button>} />}
    {(error || list.error) && <Notice tone="bad">{error ?? list.error?.message}</Notice>}
  </Section>;
}
