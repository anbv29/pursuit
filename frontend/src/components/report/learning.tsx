"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Field, Notice, Textarea } from "../ui";

const learningSchema = z.object({
  captured_at: z.string(), omitted_items: z.number(), caveat: z.string(),
  observations: z.array(z.object({ id: z.string(), recorded_at: z.string(), text: z.string(), shortened: z.boolean() })),
  tasks: z.array(z.object({ id: z.string(), day: z.number(), done: z.boolean(), text: z.string(), shortened: z.boolean() })),
  experiments: z.array(z.object({ id: z.string(), title: z.string(), archived: z.boolean(), interviews_completed: z.number(), outcome_counts: z.record(z.string(), z.number()) })),
});

export function ReportLearning({ path, base }: { path: string; base: string }) {
  const history = useApi<unknown>(`${path}/learning`);
  const parsed = learningSchema.safeParse(history.data);
  const learning = parsed.success ? parsed.data : null;
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async () => {
    try {
      await api(`${path}/learning`, { json: { text: text.trim() } });
      setText(""); setError(null); await history.reload();
    } catch (e) { setError(errorMessage(e)); }
  });
  return <div className="mb-6 space-y-4 rounded-xl border border-line bg-sunken p-4 print:hidden">
    <h3 className="font-semibold">Pick up where you left off</h3>
    <p className="text-sm text-ink-2">Save what you tried, what happened and what changed your mind. Notes stay with this report and inform follow-up answers and future refreshes.</p>
    <Field label="What did you learn?">{id => <Textarea id={id} value={text} maxLength={3000} onChange={e => setText(e.target.value)} placeholder="We interviewed five buyers. Three already use a workaround. Nobody committed to paying yet." />}</Field>
    <Button variant="secondary" disabled={!text.trim()} loading={save.pending} onClick={() => save.run()}>Save learning</Button>
    {history.data !== null && !learning && <Notice tone="bad">Saved learning could not be read. Please reload this report.</Notice>}
    {(error || history.error) && <Notice tone="bad">{error || errorMessage(history.error)}</Notice>}
    {!history.data && !history.error && <p className="text-sm text-ink-3">Loading saved learning…</p>}
    {learning && <>
      <p className="text-xs text-ink-3">{learning.caveat}</p>
      <ul className="space-y-3 text-sm">{learning.observations.map(note => <li key={note.id} className="border-t border-line pt-3">
        <p className="text-xs text-ink-3">Founder observation · {new Date(note.recorded_at).toLocaleDateString()}</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{note.text}{note.shortened && "… (preview shortened)"}</p>
      </li>)}</ul>
      {learning.tasks.map(task => <p key={task.id} className="text-sm text-ink-2">Day {task.day} · {task.done ? "Completed" : "In progress"}: {task.text || "No notes saved"}{task.shortened && "… (preview shortened)"}</p>)}
      {learning.experiments.map(exp => <div key={exp.id} className="text-sm">
        <Link href={`${base}/experiments/${exp.id}`} className="font-medium text-trail underline">{exp.title}</Link>
        <p className="text-ink-3">{exp.archived && "Archived · "}{exp.interviews_completed} completed interviews · {Object.entries(exp.outcome_counts).map(([kind, count]) => `${count} ${kind.replace(/_/g, " ")}`).join(", ") || "No outcomes recorded"}</p>
      </div>)}
      {!learning.observations.length && !learning.tasks.length && !learning.experiments.length && <p className="text-sm text-ink-3">No saved learning yet. Your first note starts the history.</p>}
      {learning.omitted_items > 0 && <p className="text-xs text-ink-3">{learning.omitted_items} older items omitted from this bounded research context. Original notes remain saved.</p>}
    </>}
  </div>;
}
