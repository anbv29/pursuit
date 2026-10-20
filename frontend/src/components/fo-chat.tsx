"use client";
import { plainCopy } from "@/lib/plain-copy";

import { MessageCircle, RefreshCw, ShieldCheck, Link2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, Notice, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

type Turn = {
  id: string; message: string; reply: string | null; status: string; mode: string;
  created_at: string; approved_at: string | null;
};
type Chat = { reports?: { id: string; name: string }[]; mode: string; connected: boolean; actions_disabled: boolean; can_send: boolean; daily_limit: number; turns: Turn[] };
const labels: Record<string, string> = {
  PENDING_APPROVAL: "Review before sending", RUNNING: "Request submitted", WORKING: "Fo is working",
  REPLIED: "Fo replied · outcome unverified", UNKNOWN: "Outcome uncertain", FAILED: "Request failed", CANCELLED: "Draft cancelled",
};
const prompts = [
  "Help me plan customer interviews. Ask me for the details you need before contacting anyone.",
  "Help me coordinate a 30-minute customer interview. First ask me for the recipient and suitable times.",
  "Draft an interview invitation for me to review. Do not send it yet.",
];

export function FoChat() {
  const { workspace } = useWorkspace();
  return <FoChatPanel key={workspace.id} />;
}

function FoChatPanel() {
  const { workspace } = useWorkspace();
  const path = `/workspaces/${workspace.id}/fo-chat`;
  const chat = useApi<Chat>(path);
  const { confirm } = useFeedback();
  const [reportId, setReportId] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef<string | null>(null);
  const turns = chat.data?.turns ?? [];
  const active = turns.some(t => ["PENDING_APPROVAL", "RUNNING", "WORKING", "UNKNOWN"].includes(t.status));
  const demo = chat.data?.mode === "demo";
  const reports = chat.data?.reports ?? [];
  const selectedReport = reports.find(r => r.id === reportId) ?? reports[0];
  const connect = useAction(async () => {
    if (!selectedReport) return;
    if (!await confirm({ title: chat.data?.connected ? "Share this report with Fo?" : "Connect Wajo and share this report?",
      body: `Pursuit will send the generated report for ${selectedReport.name}, including its source links, to your own Wajo account after you approve. Raw inputs, billing information and other projects are excluded. Wajo’s own limits apply.`,
      confirm: chat.data?.connected ? "Share report" : "Continue to Wajo",
    })) return;
    setError(null);
    try {
      const body = { report_id: selectedReport.id, share_report: true, request_key: crypto.randomUUID() };
      if (chat.data?.connected) { await api(`${path}/context`, { json: body }); await chat.reload(); }
      else { const result = await api<{ url: string }>(`${path}/connect`, { json: body }); window.location.assign(result.url); }
    } catch (e) { setError(errorMessage(e)); await chat.reload(); }
  });
  const disabled = !chat.data || !chat.data.can_send || chat.data.actions_disabled || (!demo && !chat.data.connected);
  const prepare = useAction(async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setError(null);
    requestKey.current ??= crypto.randomUUID();
    try {
      await api(path, { json: { message: draft.trim(), request_key: requestKey.current } });
      setDraft(""); requestKey.current = null;
      await chat.reload();
    } catch (e) { setError(errorMessage(e)); await chat.reload(); }
  });
  const change = useAction(async (turn: Turn, action: "approve" | "check" | "close") => {
    if (action === "approve" && !await confirm({
      title: demo ? "Run this demo preview?" : "Approve this request to Fo?",
      body: demo ? "Nothing will be sent to Wajo. This shows how the chat flow works."
        : "Your request and the report context you shared will be sent to your own Fo account. Approve only the exact request shown above. Any recipients, messages and meeting details must be correct. Only approve the exact request shown.",
      confirm: demo ? "Run demo preview" : "Approve and send to Fo",
    })) return;
    setError(null);
    try { await api(`${path}/${turn.id}/${action}`, { method: "POST" }); }
    catch (e) { setError(errorMessage(e)); }
    await chat.reload();
  });

  return <div className="mx-auto max-w-3xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 font-ui text-xs font-semibold uppercase tracking-widest text-trail">Your project, in motion</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Fo Assistant</h1>
        <p className="mt-2 max-w-xl text-ink-2">Plan interviews, coordinate meetings and talk through tasks with your project assistant.</p></div>
      <Button variant="secondary" onClick={() => void chat.reload()} disabled={chat.loading || change.pending}><RefreshCw className="size-4" aria-hidden />Refresh chat</Button>
    </header>
    {chat.data && <Notice tone={demo ? "demo" : "flag"}>
      {demo ? "Demo mode, requests are simulated. Nothing is sent and no meeting is booked."
        : "Fo uses your own Wajo account. Review requests before sending. Wajo’s account limits apply."}
      <span className="mt-1 block">This conversation is separate from your report questions.</span>
    </Notice>}
    {!demo && chat.data && !chat.data.connected && <Notice tone="flag">Connect your Wajo account below. After you approve, you’ll return here and your selected report will be shared with Fo.</Notice>}
    {chat.data && !demo && chat.data.can_send && <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Wajo connection and report context">
      <h2 className="font-ui text-sm font-semibold">{chat.data.connected ? "Your report context" : "Connect your Wajo account"}</h2>
      {selectedReport ? <><label htmlFor="fo-report" className="mt-3 block text-sm text-ink-2">Report to share with Fo</label>
        <select id="fo-report" value={selectedReport.id} onChange={event => setReportId(event.target.value)} disabled={connect.pending || active} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink">{reports.map(report => <option key={report.id} value={report.id}>{report.name}</option>)}</select>
        <p className="mt-2 text-sm text-ink-2">The complete generated report and source links will be sent to your own Fo account. No research credits or report-question allowance are used.</p>
        <Button className="mt-3" disabled={connect.pending || active || chat.data.actions_disabled} onClick={() => void connect.run()}><Link2 className="size-4" aria-hidden />{connect.pending ? "Preparing…" : chat.data.connected ? "Share selected report" : "Connect Wajo & share report"}</Button>
      </> : <p className="mt-3 text-sm text-ink-2"><Link className="underline" href={`/w/${workspace.id}/reports/new`}>Generate a company report</Link> first to give Fo the context for your questions.</p>}
    </section>}
    {chat.data?.actions_disabled && <Notice tone="flag">Fo actions are paused by the operator.</Notice>}
    {chat.data && !chat.data.can_send && <Notice tone="trail">Only the project owner can submit Fo requests. Chat history is private to each account.</Notice>}
    {(error || chat.error) && <Notice tone="bad">{error ?? chat.error?.message} Refresh chat before retrying a request.</Notice>}
    {chat.loading && !chat.data && <Skeleton className="h-48" />}
    {chat.data && <>
      <section aria-label="Fo conversation" className="space-y-6 rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
        {!turns.length && <div className="py-6">
          <MessageCircle className="mb-4 size-7 text-trail" aria-hidden />
          <h2 className="font-display text-xl font-semibold">What would you like to move forward?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Start with a request. You’ll review it before Fo receives anything. Your selected report is shared after connection approval. Other projects and prospect lists are not attached.</p>
          <div className="mt-5 grid gap-2">{prompts.map(prompt => <button key={prompt} disabled={disabled} onClick={() => { setDraft(prompt); requestKey.current = null; }} className="rounded-xl border border-line px-4 py-3 text-left text-sm text-ink-2 transition-colors hover:border-line-strong hover:bg-sunken disabled:opacity-50">{prompt}</button>)}</div>
        </div>}
        {turns.map(turn => <article key={turn.id} className="space-y-3 border-b border-line pb-6 last:border-b-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3"><span className="font-ui font-semibold text-ink">You</span><time dateTime={turn.created_at}>{new Date(turn.created_at).toLocaleString()}</time><Badge>{turn.mode === "demo" ? "Demo" : "Live"}</Badge></div>
          <p className="whitespace-pre-wrap break-words rounded-xl bg-sunken px-4 py-3 text-sm leading-relaxed">{turn.message}</p>
          <p className="font-ui text-xs font-semibold text-ink-2" role="status">{turn.mode === "demo" && turn.status === "REPLIED" ? "Simulated reply · nothing sent" : labels[turn.status] ?? turn.status}</p>
          {turn.reply && <div className="border-l-2 border-accent pl-4"><p className="mb-1 text-xs font-semibold text-trail">Fo{turn.mode === "demo" ? " · demo preview" : " · provider response"}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{plainCopy(turn.reply)}</p></div>}
          {turn.status === "REPLIED" && turn.mode === "live" && <p className="text-xs text-ink-3">Fo’s reply is not proof that an email was delivered or a meeting was booked. Confirm in your email or calendar.</p>}
          <div className="flex flex-wrap gap-2">
            {turn.status === "PENDING_APPROVAL" && <><Button disabled={change.pending || disabled} onClick={() => void change.run(turn, "approve")}>{demo ? "Review demo request" : "Review & approve"}</Button><Button variant="ghost" disabled={change.pending} onClick={() => void change.run(turn, "close")}>Cancel draft</Button></>}
            {["RUNNING", "WORKING", "UNKNOWN"].includes(turn.status) && <Button variant="secondary" disabled={change.pending} onClick={() => void change.run(turn, "check")}>Check Fo status</Button>}
            {turn.status === "UNKNOWN" && <p className="text-sm text-ink-2">Contact support to review this request. Do not submit the same action again.</p>}
          </div>
        </article>)}
      </section>
      <form onSubmit={event => void prepare.run(event)} className="rounded-2xl border border-line bg-surface p-4">
        <label htmlFor="fo-message" className="mb-2 block text-sm font-semibold">Message Fo</label>
        <textarea id="fo-message" value={draft} onChange={event => { setDraft(event.target.value); requestKey.current = null; }} maxLength={2000} rows={4} disabled={disabled || active || prepare.pending || change.pending} placeholder="Describe what you need. Include recipients and timing if you want to arrange a meeting." className="w-full resize-y rounded-xl border border-line bg-paper p-3 text-base text-ink disabled:opacity-50" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-ink-3">{draft.length}/2,000 · Up to {chat.data.daily_limit} requests per 24 hours</p><Button type="submit" disabled={disabled || active || !draft.trim() || prepare.pending || change.pending}>{prepare.pending ? "Saving draft…" : "Review request"}</Button></div>
        {active && <p className="mt-3 text-sm text-ink-2">Review or check the current request before starting another.</p>}
      </form>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />Your last 100 requests appear here and stay private to your account in this project. Messages are stored in Pursuit and approved requests are shared with Wajo. Don’t include passwords or API keys.</p>
    </>}
  </div>;
}
