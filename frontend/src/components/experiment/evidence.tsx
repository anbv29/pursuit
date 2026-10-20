"use client";

import { ExternalLink, FileSearch, Globe, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import type { Evidence, Source } from "@/lib/types";
import { useFeedback } from "../feedback";
import { Badge, Button, Card, CardHeader, cx, DemoBadge, Empty, Field, Input, Notice, Select, Skeleton, Textarea } from "../ui";
import { useExperiment } from "./context";

const KIND = {
  observed_fact: { title: "Observed facts", help: "Things directly seen in a source or conversation." },
  interpretation: { title: "Interpretations", help: "What we think the facts mean. Includes AI-generated reasoning." },
  assumption: { title: "Unverified assumptions", help: "Beliefs not yet backed by evidence. Test these." },
} as const;
const STANCE_TONE = { supports: "good", contradicts: "bad", neutral: "muted" } as const;

function SourceForm({ onAdded }: { onAdded: () => void }) {
  const { path, touch } = useExperiment();
  const { toast } = useFeedback();
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const run = useAction(async (fetchPage: boolean) => {
    setErr(null);
    try {
      await api(fetchPage ? `${path}/sources/fetch` : `${path}/sources`, { json: { url } });
      setUrl("");
      onAdded();
      touch();
      toast("success", fetchPage ? "Page fetched and saved with its retrieval time." : "Source saved.");
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run.run(true); }} className="space-y-2 p-4">
      <div className="flex gap-2">
        <Input aria-label="Source URL" type="url" placeholder="https://competitor.com/pricing" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" loading={run.pending} disabled={!url}><Globe className="size-3.5" /> Fetch</Button>
        <Button type="button" variant="secondary" disabled={!url || run.pending} onClick={() => run.run(false)}>Save link only</Button>
      </div>
      <p className="text-xs text-ink-3">Fetching runs on the server, only for public pages, and stores an excerpt as untrusted content.</p>
      {err && <Notice tone="bad">{err}</Notice>}
    </form>
  );
}

function EvidenceForm({ sources, onAdded }: { sources: Source[]; onAdded: () => void }) {
  const { path, touch } = useExperiment();
  const empty = { kind: "observed_fact", stance: "supports", claim: "", relevance: 0.6, source_id: "", tags: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const run = useAction(async () => {
    if (f.claim.trim().length < 3) return setErr("Write the claim in a sentence.");
    setErr(null);
    try {
      await api(`${path}/evidence`, {
        json: { ...f, source_id: f.source_id || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) },
      });
      setF(empty);
      onAdded();
      touch();
    } catch (e) {
      setErr(errorMessage(e));
    }
  });
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run.run(); }} className="grid gap-3 p-4 md:grid-cols-4">
      <div className="md:col-span-4">
        <Field label="Claim">{(id) => <Textarea id={id} rows={2} value={f.claim} onChange={(e) => setF({ ...f, claim: e.target.value })} placeholder="e.g. 3 of 5 managers reconcile claims in Excel weekly." />}</Field>
      </div>
      <Field label="Type">{(id) => (
        <Select id={id} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="observed_fact">Observed fact</option><option value="interpretation">Interpretation</option><option value="assumption">Assumption</option>
        </Select>)}</Field>
      <Field label="Stance">{(id) => (
        <Select id={id} value={f.stance} onChange={(e) => setF({ ...f, stance: e.target.value })}>
          <option value="supports">Supports hypothesis</option><option value="contradicts">Contradicts hypothesis</option><option value="neutral">Neutral</option>
        </Select>)}</Field>
      <Field label="Source">{(id) => (
        <Select id={id} value={f.source_id} onChange={(e) => setF({ ...f, source_id: e.target.value })}>
          <option value="">No source</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.title || s.url}</option>)}
        </Select>)}</Field>
      <Field label={`Relevance ${Math.round(f.relevance * 100)}%`}>{(id) => (
        <input id={id} type="range" min={0} max={1} step={0.05} value={f.relevance} onChange={(e) => setF({ ...f, relevance: Number(e.target.value) })} className="mt-2 w-full accent-[var(--trail)]" />)}</Field>
      <div className="md:col-span-3"><Field label="Tags" hint="Comma separated. Use competitor:Name to profile a competitor.">{(id) => <Input id={id} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />}</Field></div>
      <div className="flex items-end"><Button type="submit" loading={run.pending} className="w-full">Add evidence</Button></div>
      {err && <div className="md:col-span-4"><Notice tone="bad">{err}</Notice></div>}
    </form>
  );
}

export function EvidencePanel() {
  const { path, touch } = useExperiment();
  const { confirm } = useFeedback();
  const ev = useApi<Evidence[]>(`${path}/evidence`);
  const src = useApi<Source[]>(`${path}/sources`);
  const [stance, setStance] = useState<"all" | "supports" | "contradicts">("all");

  const remove = async (e: Evidence) => {
    if (!(await confirm({ title: "Delete evidence?", body: `“${e.claim.slice(0, 120)}” will be removed from this experiment.`, confirm: "Delete", danger: true }))) return;
    await api(`${path}/evidence/${e.id}`, { method: "DELETE" });
    await ev.reload();
    touch();
  };

  const items = (ev.data ?? []).filter((e) => stance === "all" || e.stance === stance);
  const counts = { supports: ev.data?.filter((e) => e.stance === "supports").length ?? 0, contradicts: ev.data?.filter((e) => e.stance === "contradicts").length ?? 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Research sources" description="Every source keeps its URL and retrieval time." />
        <SourceForm onAdded={src.reload} />
        {src.data && src.data.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {src.data.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <FileSearch className="size-4 shrink-0 text-ink-3" />
                <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 truncate hover:text-trail">{s.title || s.url}</a>
                {s.origin === "demo" && <DemoBadge label="Demo" />}
                <span className="shrink-0 text-xs text-ink-3">Retrieved {new Date(s.retrieved_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Add evidence" />
        <EvidenceForm sources={src.data ?? []} onAdded={ev.reload} />
      </Card>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stance">
        {(["all", "supports", "contradicts"] as const).map((s) => (
          <button key={s} onClick={() => setStance(s)} aria-pressed={stance === s}
            className={cx("rounded-full border px-3 py-1 text-xs", stance === s ? "border-trail bg-trail-soft text-trail-strong" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
            {s === "all" ? `All (${ev.data?.length ?? 0})` : s === "supports" ? `Supporting (${counts.supports})` : `Contradicting (${counts.contradicts})`}
          </button>
        ))}
      </div>

      {ev.loading && !ev.data ? <Skeleton className="h-40" /> : !ev.data?.length ? (
        <Card><Empty title="No evidence yet" body="Add sources and record what they show, including anything that contradicts your hypothesis." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => {
            const group = items.filter((e) => e.kind === k);
            return (
              <Card key={k}>
                <CardHeader title={`${KIND[k].title} (${group.length})`} description={KIND[k].help} />
                <ul className="divide-y divide-line">
                  {group.length === 0 && <li className="px-4 py-4 text-xs text-ink-3">None.</li>}
                  {group.map((e) => (
                    <li key={e.id} className={cx("group px-4 py-3", e.stance === "contradicts" && "bg-flag-soft/40")}>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={STANCE_TONE[e.stance]}>{e.stance}</Badge>
                        {e.origin === "demo" && <DemoBadge label="Demo" />}
                        <span className="ml-auto text-[11px] tabular-nums text-ink-3" title="Relevance">{Math.round(e.relevance * 100)}%</span>
                        <button onClick={() => remove(e)} aria-label="Delete evidence" className="text-ink-3 opacity-0 hover:text-d-stop focus:opacity-100 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                      </div>
                      <p className="mt-1.5 text-sm">{e.claim}</p>
                      {e.source ? (
                        <a href={e.source.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-trail">
                          <ExternalLink className="size-3" /> {e.source.title || new URL(e.source.url).hostname} · {new Date(e.source.retrieved_at).toLocaleDateString()}
                        </a>
                      ) : <p className="mt-1 text-xs text-ink-3">No source linked</p>}
                      {e.tags.length > 0 && <p className="mt-1 text-[11px] text-ink-3">{e.tags.join(" · ")}</p>}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
