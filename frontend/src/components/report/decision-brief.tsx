import type { StrategicInsight } from "@/lib/types";
import { Badge } from "../ui";
import { Cites } from "./parts";

export function DecisionBrief({ insights }: { insights?: StrategicInsight[] }) {
  if (!insights?.length) return null;
  return <div className="mt-8 border-t border-line pt-6">
    <p className="text-xs font-semibold uppercase tracking-widest text-trail">Beyond the obvious</p>
    <h3 className="mt-2 font-display text-2xl font-semibold">What you might be missing</h3>
    <p className="mt-2 text-sm text-ink-3">Evidence-linked possibilities, challenged before you act. Confidence describes evidence strength, not a measured probability.</p>
    <div className="mt-5 space-y-5">{insights.map((insight, i) => <article key={i} className="min-w-0 rounded-xl border border-line p-4 [overflow-wrap:anywhere] sm:p-5">
      <div className="flex flex-wrap items-center gap-2"><Badge tone="trail">{i + 1}</Badge><Badge>{insight.status === "hypothesis" ? "Hypothesis to test" : "Evidence-linked interpretation"}</Badge><Badge tone="muted">{insight.confidence} confidence</Badge></div>
      <h4 className="mt-3 text-lg font-semibold">{insight.title}</h4><p className="mt-2 text-sm leading-relaxed">{insight.finding}</p>
      <dl className="mt-4 space-y-3 text-sm">{[["How we got here", insight.reasoning], ["What this changes", insight.implication], ["Why it could be wrong", insight.counterargument], ["Test it next", insight.next_test]].map(([label, text]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 leading-relaxed text-ink-2">{text}</dd></div>)}</dl>
      <div className="mt-4 grid gap-3 rounded-lg bg-sunken p-3 text-sm sm:grid-cols-2"><p><b>If supported:</b> {insight.decision_if_supported}</p><p><b>If rejected:</b> {insight.decision_if_rejected}</p></div>
      <details className="mt-4 text-sm"><summary className="cursor-pointer py-1 font-medium text-trail">Inspect evidence and limitations</summary>
        {insight.evidence.length ? insight.evidence.map((e, j) => <blockquote key={j} className="my-3 border-l-2 border-line pl-3 text-ink-2">“{e.quote}” <Cites ids={[e.source_id]} /></blockquote>) : <p className="mt-2 text-ink-3">No supporting quotation was verified.</p>}
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink-3">{insight.limitations.map((item, j) => <li key={j}>{item}</li>)}</ul>
      </details>
    </article>)}</div>
  </div>;
}
