"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Evidence, HighlightCategory, InterviewCapture, InterviewCaptureSummary, InterviewHighlight } from "@/lib/types";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, Notice, Select, Skeleton, Textarea } from "../ui";
import { useExperiment } from "./context";

const CATEGORY: Record<HighlightCategory, string> = {
  pain: "Pain point", objection: "Objection", current_solution: "Current solution",
  buying_signal: "Buying signal", other: "Other finding",
};
type Stance = Evidence["stance"];

function HighlightReview({ highlight, capture, endpoint, onDone }: {
  highlight: InterviewHighlight; capture: InterviewCapture; endpoint: string; onDone: () => Promise<void>;
}) {
  const { exp, touch } = useExperiment();
  const [claim, setClaim] = useState(highlight.quote);
  const [stance, setStance] = useState<Stance>("neutral");
  const [error, setError] = useState<string | null>(null);
  const line = useMemo(() => Array.from(capture.transcript).slice(0, highlight.start_offset).join("").split("\n").length, [capture.transcript, highlight.start_offset]);
  const save = useAction(async () => {
    setError(null);
    try {
      await api(`${endpoint}/${capture.id}/highlights/${highlight.id}/accept`, { json: { claim, stance } });
      await onDone();
      touch();
    } catch (e) { setError(errorMessage(e)); }
  });
  return <article aria-label={`${CATEGORY[highlight.category]} highlight, line ${line}`} className="space-y-3 border-t border-line py-5 first:border-0 first:pt-0">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-sm font-semibold">{CATEGORY[highlight.category]}</h3>
      <span className="text-xs text-ink-3">Line {line}</span>
      <Badge tone={highlight.evidence_id ? "good" : "muted"}>{highlight.evidence_id ? "Reviewed" : "Suggested"}</Badge>
    </div>
    <blockquote className="rounded-xl bg-sunken p-3 text-sm leading-relaxed [overflow-wrap:anywhere]">“{highlight.quote}”</blockquote>
    {highlight.evidence_id ? <Link href={`/w/${exp.workspace_id}/experiments/${exp.id}?tab=evidence`} className="inline-flex min-h-11 items-center text-sm font-semibold text-trail hover:underline">View added evidence</Link> : (
      <form className="space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); void save.run(); }}>
        <Field label="Your reviewed finding" hint="Keep the participant’s statement separate from your interpretation.">{(id, d) => <Textarea id={id} aria-describedby={d} rows={2} value={claim} onChange={e => setClaim(e.target.value)} required minLength={3} maxLength={4000} />}</Field>
        <Field label="Relationship to your hypothesis">{id => <Select id={id} value={stance} onChange={e => setStance(e.target.value as Stance)}>
          <option value="neutral">Neutral / needs investigation</option><option value="supports">Supports</option><option value="contradicts">Contradicts</option>
        </Select>}</Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" variant="secondary" loading={save.pending} disabled={claim.trim().length < 3}>Add reviewed finding</Button>
      </form>
    )}
  </article>;
}

function ManualHighlight({ capture, endpoint, onDone }: { capture: InterviewCapture; endpoint: string; onDone: () => Promise<void> }) {
  const [quote, setQuote] = useState("");
  const [category, setCategory] = useState<HighlightCategory>("other");
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async () => {
    setError(null);
    const index = capture.transcript.indexOf(quote);
    if (index < 0) { setError("Copy an exact quotation from the saved notes."); return; }
    try {
      await api(`${endpoint}/${capture.id}/highlights`, { json: {
        category, quote, start_offset: Array.from(capture.transcript.slice(0, index)).length,
      } });
      setQuote("");
      await onDone();
    } catch (e) { setError(errorMessage(e)); }
  });
  return <details className="border-t border-line pt-4">
    <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-trail">Add your own highlight</summary>
    <form onSubmit={e => { e.preventDefault(); void save.run(); }} className="mt-3 space-y-3">
      <Field label="Exact quotation" hint="Copy wording from the original notes below.">{id => <Textarea id={id} value={quote} onChange={e => setQuote(e.target.value)} rows={2} required minLength={3} maxLength={4000} />}</Field>
      <Field label="Highlight category">{id => <Select id={id} value={category} onChange={e => setCategory(e.target.value as HighlightCategory)}>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>}</Field>
      {error && <Notice tone="bad">{error}</Notice>}
      <Button type="submit" variant="secondary" loading={save.pending} disabled={quote.trim().length < 3}>Save highlight for review</Button>
    </form>
  </details>;
}

export function InterviewCapturePanel() {
  const { path, version, touch } = useExperiment();
  const search = useSearchParams();
  const endpoint = `${path}/interview-captures`;
  const captures = useApi<InterviewCaptureSummary[]>(endpoint, version);
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? search.get("capture") ?? captures.data?.[0]?.id;
  const detail = useApi<InterviewCapture>(active ? `${endpoint}/${active}` : null, version);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async () => {
    setError(null);
    try {
      const capture = await api<InterviewCapture>(endpoint, { json: { title, transcript } });
      setSelected(capture.id);
      setTitle(""); setTranscript("");
      await captures.reload();
      touch();
    } catch (e) { setError(errorMessage(e)); }
  });
  const upload = useAction(async (file: File) => {
    setError(null);
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 320000) {
      setError("Choose a .txt or .md file up to 320 KB and 80,000 characters."); return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (text.length > 80000 || /[\x00-\x08\x0e-\x1f]/.test(text)) {
        setError("Use a plain-text file with at most 80,000 characters."); return;
      }
      setTranscript(text);
      setTitle(current => current || file.name.replace(/\.(txt|md)$/i, "").slice(0, 160));
    } catch { setError("This file could not be read as UTF-8 text. Paste the notes instead."); }
  });

  return <div className="space-y-6">
    <Card>
      <CardHeader title="Capture an interview" description="Paste notes or upload a text transcript. Review quote-backed highlights before adding evidence." />
      <form className="space-y-4 p-5" onSubmit={e => { e.preventDefault(); void save.run(); }}>
        <Field label="Interview title">{id => <Input id={id} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Shop owner, inventory workflow" maxLength={160} required />}</Field>
        <Field label="Upload interview notes" hint="Plain text or Markdown, up to 80,000 characters.">{(id, d) => <input id={id} aria-describedby={d} type="file" accept=".txt,.md,text/plain,text/markdown" className="block min-h-11 w-full max-w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-ink" disabled={upload.pending} onChange={e => { const file = e.target.files?.[0]; if (file) void upload.run(file); e.target.value = ""; }} />}</Field>
        <Field label="Interview notes or transcript" hint={`${transcript.length.toLocaleString()} / 80,000 characters`}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={7} value={transcript} onChange={e => setTranscript(e.target.value)} minLength={10} maxLength={80000} required />}</Field>
        <p className="text-xs leading-relaxed text-ink-3">Saved notes are visible to your workspace. No text is sent to an AI service. Saving notes does not mark an interview completed or prove customer demand.</p>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" loading={save.pending} disabled={upload.pending || !title.trim() || transcript.trim().length < 10}>Save notes & find highlights</Button>
      </form>
    </Card>

    <Card>
      <CardHeader title="Review interview highlights" description="Suggestions use wording in your notes, not speaker analysis. Check the context, then decide what belongs in your evidence." />
      <div className="space-y-5 p-5">
        {captures.error ? <Notice tone="bad">{captures.error.message} <button className="underline" onClick={() => void captures.reload()}>Try again</button></Notice>
          : captures.loading ? <Skeleton className="h-24" />
            : !captures.data?.length ? <Empty title="No interview notes yet" body="Save a conversation above to keep its original wording alongside your findings." /> : <>
              <Field label="Saved interview notes" hint="Your 100 most recent captures.">{id => <Select id={id} value={active ?? ""} onChange={e => setSelected(e.target.value)}>{(captures.data ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>}</Field>
              {detail.error ? <Notice tone="bad">{detail.error.message}</Notice> : detail.loading ? <Skeleton className="h-40" /> : detail.data && <article id={`capture-${detail.data.id}`} className="scroll-mt-28 space-y-4">
                <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{detail.data.title}</h3>
                {!detail.data.highlights.length && <p className="text-sm text-ink-2">No wording-based suggestions were found. You can add a quotation yourself below.</p>}
                <div>{detail.data.highlights.map(h => <HighlightReview key={h.id} highlight={h} capture={detail.data!} endpoint={endpoint} onDone={detail.reload} />)}</div>
                <ManualHighlight key={detail.data.id} capture={detail.data} endpoint={endpoint} onDone={detail.reload} />
                <details className="border-t border-line pt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-trail">Original interview notes</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-sunken p-4 font-sans text-sm leading-relaxed [overflow-wrap:anywhere]">{detail.data.transcript}</pre></details>
              </article>}
            </>}
      </div>
    </Card>
  </div>;
}
