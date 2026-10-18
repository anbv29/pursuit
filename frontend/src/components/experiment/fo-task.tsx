"use client";
import { useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Action } from "@/lib/types";
import { useFeedback } from "../feedback";
import { Button, Field, Input, Notice, Select, Textarea } from "../ui";
import { useExperiment } from "./context";

type Update = { id: string; state: string; summary: string; created_at: string };

export function FoTask({ action, refresh }: { action: Action; refresh: () => void }) {
  const { path, version } = useExperiment();
  const { confirm } = useFeedback();
  const taskPath = `${path}/actions/${action.id}`;
  const history = useApi<Update[]>(`${taskPath}/conversation`, `${version}-${action.status}-${action.fo_state}`);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("booked");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useAction(async (suffix: string, json: unknown) => {
    try {
      await api(`${taskPath}/${suffix}`, { method: "POST", json });
      setError(null); if (suffix === "reply") setMessage("");
      await history.reload(); refresh();
    } catch (e) { setError(e instanceof ApiError && e.fields ? Object.values(e.fields).join(" ") : errorMessage(e)); }
  });
  const answer = async () => {
    if (await confirm({ title: "Approve this answer to Fo?", confirm: "Approve reply", danger: action.mode === "live",
      body: <div className="space-y-2"><p>{message}</p><p>Fo must keep the original recipient, scheduling window, deadline and reminder limits.</p></div> }))
      await run.run("reply", { message });
  };
  const record = async () => {
    const simulated = action.mode === "demo";
    if (await confirm({ title: simulated ? "Record a simulated result?" : "Confirm the interview result?", confirm: "Record result",
      body: simulated ? "This stays labelled demo and is excluded from live metrics." : "Only confirm what you checked in your inbox or calendar. A booking does not mean the interview happened." }))
      await run.run("interview-result", { result, scheduled_at: result === "booked" && time ? new Date(time).toISOString() : null, note });
  };
  const recorded = ["booked", "declined", "no_response"].includes(action.fo_state ?? "");
  return <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
    {recorded && <Notice>{action.mode === "demo" ? "Simulated result: " : "Recorded result: "}{action.fo_state?.replace(/_/g, " ")}. A booking is a planned interview, not a completed conversation.</Notice>}
    {action.fo_state === "needs_input" && <Notice tone="flag">Fo needs attention. Review its reply below. It may need clarification or an outcome check.</Notice>}
    {action.status === "UNKNOWN" && <Button size="sm" variant="secondary" loading={run.pending} onClick={() => run.run("check", {})}>Check Fo update</Button>}
    <details><summary className="cursor-pointer text-trail">Coordination history</summary>
      {history.loading && !history.data ? <p className="py-2 text-ink-3">Loading updates…</p> :
        <ol className="mt-2 space-y-3">{history.data?.map((u) => <li key={u.id}>
          <p className="text-xs text-ink-3">{u.state.replace(/_/g, " ")} · {new Date(u.created_at).toLocaleString()}</p>
          <p className="whitespace-pre-wrap break-words">{u.summary}</p>
        </li>)}</ol>}
      {history.data?.length === 0 && <p className="mt-2 text-ink-3">Updates appear after approval and execution.</p>}
      {history.error && <Notice tone="bad">{history.error.message}</Notice>}
    </details>
    {action.status === "UNKNOWN" && action.fo_state === "needs_input" && <div className="space-y-2">
      <Field label="Your answer to Fo" hint="Clarify this task only. A different recipient or wider schedule needs a new approval.">{(id) => <Textarea id={id} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />}</Field>
      <Button size="sm" loading={run.pending} disabled={message.trim().length < 3} onClick={answer}>Review reply to Fo</Button>
    </div>}
    {!recorded && ["UNKNOWN", "SUCCEEDED"].includes(action.status) && <details>
      <summary className="cursor-pointer text-trail">{action.mode === "demo" ? "Record a simulated interview result" : "Confirm interview booking or response"}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-ink-3">A confirmed booking creates a planned interview. Record attendance and findings after the conversation.</p>
        <Field label="Interview coordination result">{(id) => <Select id={id} value={result} onChange={(e) => setResult(e.target.value)}><option value="booked">Booking confirmed</option><option value="declined">They declined</option><option value="no_response">No response</option></Select>}</Field>
        {result === "booked" && <Field label="Confirmed meeting time" hint="Enter the time in your device's local timezone.">{(id) => <Input id={id} type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>}
        <Field label="Confirmation note">{(id) => <Input id={id} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <Button size="sm" loading={run.pending} disabled={result === "booked" && !time} onClick={record}>Review and record result</Button>
      </div>
    </details>}
    {error && <Notice tone="bad">{error}</Notice>}
  </div>;
}
