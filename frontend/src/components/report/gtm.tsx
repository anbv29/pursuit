"use client";

import { useState } from "react";
import type { GTMStrategy, Report, ReportSource, Measurement } from "@/lib/types";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { Button, Notice } from "@/components/ui";
import { GTMConstraintsForm, defaultConstraints, constraintsSchema, researchUrlsSchema, splitResearchUrls } from "@/components/gtm-constraints";
import { Section, Claims, Label, Bullets } from "./parts";

export function StrategyView({ strategy: s }: { strategy: GTMStrategy }) {
  return <div className="space-y-6 [overflow-wrap:anywhere]">
    <p className="text-sm text-ink-2">AI-proposed recommendations and testing thresholds. Validate them with buyers before committing resources; cited public statements are not independently verified.</p>
    <div className="rounded-xl bg-accent-soft p-4"><Label>Objective</Label><p className="font-medium">{s.objective}</p></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><Label>First buyer</Label><Claims items={[s.first_buyer]} /></div><div><Label>Positioning</Label><Claims items={[s.positioning]} /></div></div>
    <div><Label>Buying process</Label><Bullets items={s.buying_process} /></div>
    <div><h3 className="mb-3 font-semibold">Channels to test</h3><div className="space-y-3">{s.channels.map((ch, i) => <article key={i} className="rounded-xl border border-line p-4">
      <h4 className="font-semibold">{ch.name}</h4><p className="mt-1 text-sm text-ink-2">{ch.audience}</p>
      <p className="my-3 text-sm font-medium text-trail">{ch.monthly_budget} {s.budget_currency ?? s.constraints?.currency ?? "(currency not recorded)"} / month · {ch.weekly_hours} hours / week</p>
      <Claims items={[ch.rationale]} compact /><dl className="mt-3 space-y-3 text-sm">{[["First action", ch.first_action], ["Proposed success signal", ch.success_signal], ["Proposed stop rule", ch.stop_rule]].map(([label, text]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-ink-2">{text}</dd></div>)}</dl>
    </article>)}</div></div>
    <div><h3 className="mb-3 font-semibold">Launch plan</h3><ol className="space-y-3">{s.launch_plan.map((p, i) => <li key={i} className="border-l-2 border-trail pl-4"><p className="text-xs font-semibold text-trail">Days {p.start_day}–{p.end_day}</p><p className="mt-1 font-medium">{p.action}</p><p className="text-sm text-ink-2">Deliverable: {p.deliverable}</p><p className="text-sm text-ink-2">Decision gate: {p.decision_gate}</p></li>)}</ol></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><Label>Not now</Label><Bullets items={s.not_now} /></div><div><Label>Assumptions to test</Label><Bullets items={s.assumptions} /></div></div>
    <Notice>{s.resourcing_note}</Notice>
    {s.constraints && <p className="text-sm text-ink-2">Plan inputs · {s.constraints.horizon_days} days · Monthly budget {s.constraints.monthly_budget ?? "unknown"} {s.constraints.currency} · Weekly hours {s.constraints.weekly_hours ?? "unknown"} · Team {s.constraints.team_size ?? "unknown"}{s.constraints.available_assets && ` · Assets: ${s.constraints.available_assets}`}{s.constraints.channel_constraints && ` · Channel limits: ${s.constraints.channel_constraints}`}</p>}
    {!!s.resource_adjustments?.length && <div><Label>Resource adjustments · review required</Label><p className="mb-2 text-sm text-ink-2">The server adjusted proposed allocations or phase dates. Review these changes before using the plan.</p><Bullets items={s.resource_adjustments} /></div>}
  </div>;
}

function StrategyEditor({ report, path, refresh }: { report: Report; path: string; refresh: () => Promise<unknown> }) {
  const [constraints, setConstraints] = useState(report.inputs.gtm_constraints ?? report.content?.gtm_strategy?.constraints ?? defaultConstraints);
  const [urls, setUrls] = useState((report.inputs.research_urls ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const submit = useAction(async () => {
    const parsed = constraintsSchema.safeParse(constraints), links = researchUrlsSchema.safeParse(splitResearchUrls(urls));
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (!links.success) return setError(links.error.issues[0].message);
    setError(null);
    try { await api(`${path}/refresh`, { json: { sections: ["gtm_strategy", "measurements"], gtm_constraints: parsed.data, research_urls: links.data, correction: "" } }); await refresh(); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <form className="space-y-4 print:hidden" onSubmit={e => { e.preventDefault(); void submit.run(); }}>
    <GTMConstraintsForm value={constraints} onChange={setConstraints} urls={urls} onUrlsChange={setUrls} disabled={submit.pending} />
    {error && <div role="alert"><Notice tone="bad">{error}</Notice></div>}
    <Button type="submit" loading={submit.pending}>{report.content?.gtm_strategy ? "Refresh my GTM strategy" : "Build my GTM strategy"}</Button>
  </form>;
}

export function GTMSection({ report, editor }: { report: Report; editor?: { path: string; refresh: () => Promise<unknown> } }) {
  const strategy = report.content?.gtm_strategy;
  return <Section id="gtm-strategy" title="Your GTM strategy">
    {strategy ? <StrategyView strategy={strategy} /> : <p className="mb-4 text-sm text-ink-2">This report has no personalized GTM strategy yet. Add your resources to build a practical plan from its research.</p>}
    {editor && (strategy ? <details className="mt-6 print:hidden"><summary className="cursor-pointer font-semibold text-trail">Update resources and refresh strategy</summary><div className="mt-4"><StrategyEditor key={report.id} report={report} {...editor} /></div></details> : <StrategyEditor key={report.id} report={report} {...editor} />)}
  </Section>;
}

export function SourceReceipt({ source: s }: { source: ReportSource }) {
  return <div className="min-w-0 space-y-1 text-xs text-ink-2 [overflow-wrap:anywhere]">
    <a href={/^https?:\/\//i.test(s.url) ? s.url : undefined} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-trail underline">{s.title || s.url}</a>
    <p>{s.id} · {s.source_role ?? s.via} · Retrieval status: {s.retrieval_status ?? "not recorded"}</p>
    <p>Retrieved: {s.retrieved_at ? new Date(s.retrieved_at).toLocaleString() : "not recorded"}</p>
    {s.excerpt && <details><summary className="cursor-pointer">Retrieved excerpt</summary><blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3">{s.excerpt}</blockquote></details>}
  </div>;
}

export function ResearchData({ measurements = [], sources }: { measurements?: Measurement[]; sources: ReportSource[] }) {
  return <Section id="research-data" title="Research data">
    <p className="mb-4 text-sm text-ink-2">Research uses accessible pages and supplied URLs. No general web search is available. Public statements are not independently verified. Quotes establish provenance, not truth or causality.</p>
    {!measurements.length && <p className="text-sm text-ink-3">No quote-backed measurements were recorded for this report.</p>}
    <div className="space-y-4 [overflow-wrap:anywhere]">{measurements.map((m, i) => { const source = sources.find(s => s.id === m.source_id); return <article key={i} className="min-w-0 rounded-xl border border-line p-4">
      <h3 className="font-semibold">{m.label}</h3><p className="mt-1 text-lg font-semibold">{m.value} <span className="text-sm font-normal">{m.unit}</span></p>
      <dl className="my-3 space-y-1 text-sm"><div><dt className="inline font-medium">Scope: </dt><dd className="inline">{m.scope}</dd></div><div><dt className="inline font-medium">Period: </dt><dd className="inline">{m.period || "Not specified"}</dd></div><div><dt className="inline font-medium">Caveat: </dt><dd className="inline">{m.caveat || "None recorded"}</dd></div></dl>
      <Label>Exact source quote</Label><blockquote className="mb-3 whitespace-pre-wrap border-l-2 border-line pl-3 text-sm">{m.quote}</blockquote>
      {source ? <SourceReceipt source={source} /> : <p className="text-xs text-ink-3">Source {m.source_id} is unavailable in this snapshot.</p>}
    </article>; })}</div>
  </Section>;
}
