import { Badge } from "@/components/ui";
import { plainCopy } from "@/lib/plain-copy";

type Claim = { text: string; kind: "fact" | "interpretation" | "assumption"; quote: string };
export type FreeContent = {
  executive_summary: Claim[];
  snapshot: { name: string; offering: Claim; business_model: Claim; investigation?: { finding: string; quote: string; reasoning: string; counterargument: string; next_test: string; why_now?: string; decision_if_supported?: string; decision_if_rejected?: string }[] };
  segments: { name: string; rationale: Claim }[];
  personas: { title: string; needs: Claim }[];
};

function Statement({ claim }: { claim: Claim }) {
  return <div className="space-y-2">
    <Badge>{claim.kind === "fact" ? "Website statement" : claim.kind === "interpretation" ? "Our interpretation" : "Hypothesis to test"}</Badge>
    <p className="text-sm leading-relaxed text-ink-2">{claim.text}</p>
    {claim.quote && <details className="text-xs text-ink-3"><summary className="cursor-pointer py-1">Supporting website quote</summary><blockquote className="mt-2 border-l-2 border-line pl-3 leading-relaxed">“{claim.quote}”</blockquote></details>}
  </div>;
}

export function FreeReportContent({ content: rawContent }: { content: FreeContent }) {
  const content = plainCopy(rawContent);
  const section = "rounded-2xl border border-line bg-surface p-5 sm:p-7";
  return <div className="space-y-5">
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">01 / The overview</p><h2 className="mt-2 font-display text-2xl font-semibold">Executive summary</h2><div className="mt-6 space-y-5">{content.executive_summary.map((claim, i) => <Statement key={i} claim={claim} />)}</div></section>
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">02 / The business</p><h2 className="mt-2 font-display text-2xl font-semibold">Company snapshot</h2><h3 className="mb-3 mt-6 font-semibold">What it offers</h3><Statement claim={content.snapshot.offering} /><h3 className="mb-3 mt-6 font-semibold">How it may make money</h3><Statement claim={content.snapshot.business_model} />
      {!!content.snapshot.investigation?.length && <div className="mt-6 space-y-4 border-t border-line pt-5"><h3 className="font-semibold">Your strongest investigation angle</h3><p className="text-sm text-ink-3">Hypotheses from the company’s public pages, challenged before you test them.</p>{content.snapshot.investigation.map((item, i) => <article key={i} className="space-y-3 rounded-xl bg-sunken p-4 text-sm [overflow-wrap:anywhere]"><Badge tone="flag">Hypothesis to test</Badge><p className="font-medium">{item.finding}</p><p className="leading-relaxed text-ink-2">{item.reasoning}</p><p><b>Why it could be wrong:</b> {item.counterargument}</p><p><b>Test it next:</b> {item.next_test}</p>{item.why_now && <p><b>Timing and trigger:</b> {item.why_now}</p>}{item.decision_if_supported && <p><b>If the test supports it:</b> {item.decision_if_supported}</p>}{item.decision_if_rejected && <p><b>If it does not:</b> {item.decision_if_rejected}</p>}<details className="text-xs text-ink-3"><summary className="cursor-pointer py-1">Supporting public-page quote</summary><blockquote className="mt-2 border-l-2 border-line pl-3">“{item.quote}”</blockquote></details></article>)}</div>}
    </section>
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">03 / Who it could help</p><h2 className="mt-2 font-display text-2xl font-semibold">Potential customer segments</h2><p className="mt-2 text-sm text-ink-3">Starting points for discovery, not validated demand.</p><div className="mt-6 divide-y divide-line">{content.segments.map((segment, i) => <article key={i} className="py-4 first:pt-0"><h3 className="mb-3 font-semibold">{segment.name}</h3><Statement claim={segment.rationale} /></article>)}</div></section>
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">04 / People to understand</p><h2 className="mt-2 font-display text-2xl font-semibold">Customer personas</h2><p className="mt-2 text-sm text-ink-3">Proposed roles and needs to check in real conversations.</p><div className="mt-6 divide-y divide-line">{content.personas.map((persona, i) => <article key={i} className="py-4 first:pt-0"><h3 className="mb-3 font-semibold">{persona.title}</h3><Statement claim={persona.needs} /></article>)}</div></section>
  </div>;
}
