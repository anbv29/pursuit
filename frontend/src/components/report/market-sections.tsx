"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { ReportContent } from "@/lib/types";
import { Badge } from "../ui";
import { Bullets, Cites, Claims, Label, Section } from "./parts";

export function Competitors({ c }: { c: ReportContent }) {
  return (
    <Section id="competitors" title="Competitive landscape" kicker="Who else they could buy">
      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              {["Competitor", "Positioning", "Target", "Pricing", "Strengths", "Weaknesses"].map((h) => (
                <th key={h} scope="col" className="py-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {c.competitors.map((x, i) => (
              <tr key={i}>
                <th scope="row" className="py-3 pr-4 text-left font-medium">
                  {x.name}
                  <div className="mt-1">{x.unsourced ? <Badge tone="flag">Unsourced</Badge> : <Cites ids={x.source_ids} />}</div>
                </th>
                <td className="py-3 pr-4 text-ink-2">{x.positioning}</td>
                <td className="py-3 pr-4 text-ink-2">{x.target_customers}</td>
                <td className="py-3 pr-4">{x.pricing || <span className="italic text-ink-3">Unknown</span>}</td>
                <td className="py-3 pr-4"><Bullets items={x.strengths} empty="—" /></td>
                <td className="py-3 pr-4"><Bullets items={x.weaknesses} empty="—" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function PositioningPricing({ c }: { c: ReportContent }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section id="positioning" title="Positioning" kicker="Where you can win">
        <blockquote className="rounded-lg border-l-4 border-trail bg-paper px-4 py-3 text-[15px] italic">{c.positioning.recommended_statement}</blockquote>
        <div className="mt-4 space-y-4">
          <div><Label>Gaps in the market</Label><Claims items={c.positioning.gaps} compact /></div>
          <div><Label>Differentiators to lead with</Label><Bullets items={c.positioning.differentiators} /></div>
        </div>
      </Section>
      <Section id="pricing" title="Pricing & willingness to pay" kicker="What to charge, what to test">
        <div className="space-y-4">
          <div><Label>Market benchmarks</Label><Claims items={c.pricing.market_benchmarks} compact empty="No reliable benchmarks found." /></div>
          <div><Label>Pricing hypotheses</Label><Bullets items={c.pricing.hypotheses} /></div>
          <div><Label>Questions that reveal real willingness to pay</Label><Bullets items={c.pricing.wtp_questions} /></div>
        </div>
      </Section>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-3 hover:bg-sunken hover:text-ink print:hidden" aria-label="Copy message">
      {done ? <Check className="size-3.5 text-trail" /> : <Copy className="size-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

export function Messaging({ c }: { c: ReportContent }) {
  return (
    <Section id="messaging" title="Outreach angles" kicker="Drafts to edit, not to send blindly">
      <div className="grid gap-4 lg:grid-cols-3">
        {c.messaging.map((m, i) => (
          <div key={i} className="flex flex-col rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-medium">{m.name}</p><p className="text-xs text-ink-3">For: {m.segment}</p></div>
              <CopyButton text={`Subject: ${m.subject}\n\n${m.body}`} />
            </div>
            <p className="mt-2 text-[13px] text-ink-2"><span className="text-ink-3">Hook: </span>{m.hook}</p>
            <div className="mt-3 flex-1 rounded-md bg-paper p-3 text-[13px]">
              <p className="font-medium">{m.subject}</p>
              <p className="mt-2 whitespace-pre-line text-ink-2">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Prospecting({ c }: { c: ReportContent }) {
  const p = c.prospecting;
  return (
    <Section id="prospecting" title="Finding prospects" kicker="Signals and channels">
      <div className="grid gap-6 md:grid-cols-3">
        <div><Label>In-market signals</Label><Bullets items={p.signals} /></div>
        <div><Label>Channels</Label><Bullets items={p.channels} /></div>
        <div><Label>Search queries to start with</Label>
          <ul className="space-y-1.5">{p.search_queries.map((q, i) => <li key={i}><code className="rounded bg-sunken px-1.5 py-0.5 text-xs">{q}</code></li>)}</ul>
        </div>
      </div>
    </Section>
  );
}

export function FunnelRisks({ c }: { c: ReportContent }) {
  return (
    <Section id="funnel" title="Where the funnel will likely leak" kicker="Hypotheses until you have real data">
      <div className="grid gap-3 md:grid-cols-2">
        {c.funnel_risks.map((f, i) => (
          <div key={i} className="rounded-lg border border-line p-4 text-sm">
            <p className="font-medium">{f.stage}</p>
            <p className="mt-1 text-ink-2">{f.risk}</p>
            <p className="mt-2 text-[13px]"><span className="text-ink-3">Watch: </span>{f.leading_metric}</p>
            <p className="text-[13px]"><span className="text-ink-3">Test: </span>{f.test}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Risks({ c }: { c: ReportContent }) {
  return (
    <Section id="risks" title="Risks & unknowns" kicker="What this report can't tell you yet">
      <Bullets items={c.risks_and_unknowns} />
    </Section>
  );
}
