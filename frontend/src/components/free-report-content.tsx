import { Badge } from "@/components/ui";
import { plainCopy } from "@/lib/plain-copy";

type Claim = { text: string; kind: "fact" | "interpretation" | "assumption"; quote: string };
export type FreeContent = {
  executive_summary: Claim[];
  snapshot: { name: string; offering: Claim; business_model: Claim };
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
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">02 / The business</p><h2 className="mt-2 font-display text-2xl font-semibold">Company snapshot</h2><h3 className="mb-3 mt-6 font-semibold">What it offers</h3><Statement claim={content.snapshot.offering} /><h3 className="mb-3 mt-6 font-semibold">How it may make money</h3><Statement claim={content.snapshot.business_model} /></section>
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">03 / Who it could help</p><h2 className="mt-2 font-display text-2xl font-semibold">Potential customer segments</h2><p className="mt-2 text-sm text-ink-3">Starting points for discovery, not validated demand.</p><div className="mt-6 divide-y divide-line">{content.segments.map((segment, i) => <article key={i} className="py-4 first:pt-0"><h3 className="mb-3 font-semibold">{segment.name}</h3><Statement claim={segment.rationale} /></article>)}</div></section>
    <section className={section}><p className="text-xs font-semibold uppercase tracking-widest text-trail">04 / People to understand</p><h2 className="mt-2 font-display text-2xl font-semibold">Customer personas</h2><p className="mt-2 text-sm text-ink-3">Proposed roles and needs to check in real conversations.</p><div className="mt-6 divide-y divide-line">{content.personas.map((persona, i) => <article key={i} className="py-4 first:pt-0"><h3 className="mb-3 font-semibold">{persona.title}</h3><Statement claim={persona.needs} /></article>)}</div></section>
  </div>;
}
