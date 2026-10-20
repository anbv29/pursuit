"use client";

import type { ReportContent } from "@/lib/types";
import { Badge, cx } from "../ui";
import { Bullets, ClaimLine, Claims, Label, Section } from "./parts";
import { DecisionBrief } from "./decision-brief";

export function Summary({ c }: { c: ReportContent }) {
  return (
    <Section id="summary" title="Executive summary" kicker="Start here">
      <ul className="space-y-2.5">
        {c.executive_summary.map((t, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-trail text-[11px] font-semibold text-accent-ink">{i + 1}</span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-lg bg-trail-soft/70 px-4 py-3">
        <p className="text-xs font-medium text-trail-strong">Focus first</p>
        <p className="mt-1 text-sm text-ink">{c.focus_first}</p>
      </div>
      <DecisionBrief insights={c.decision_brief} />
    </Section>
  );
}

export function Snapshot({ c }: { c: ReportContent }) {
  const s = c.snapshot;
  return (
    <Section id="snapshot" title={s.name} kicker="Company snapshot">
      <p className="text-[15px] text-ink">{s.one_liner}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {[["Offering", s.offering], ["Business model", s.business_model], ["Stage", s.stage_assessment]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-paper p-3"><dt className="text-xs text-ink-3">{k}</dt><dd className="mt-1 text-sm">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div><Label>Observed pricing</Label><Claims items={s.observed_pricing} compact empty="No public pricing found." /></div>
        <div><Label>Key facts</Label><Claims items={s.key_facts} compact /></div>
      </div>
    </Section>
  );
}

export function Segments({ c }: { c: ReportContent }) {
  return (
    <Section id="segments" title="Who to sell to" kicker="ICP segments, best fit first">
      <div className="grid gap-4 lg:grid-cols-2">
        {c.segments.map((s, i) => (
          <div key={i} className={cx("rounded-lg border p-4", i === 0 ? "border-trail/50 bg-trail-soft/30" : "border-line")}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{s.name}</p>
              <span className="flex shrink-0 gap-0.5" aria-label={`Fit ${s.fit_score} of 5`} title={`Fit ${s.fit_score}/5`}>
                {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cx("h-2 w-3 rounded-sm", n <= s.fit_score ? "bg-trail" : "bg-line")} />)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-2">{s.description}</p>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div><dt className="inline text-ink-3">Pains: </dt><dd className="inline">{s.pains.join("; ")}</dd></div>
              <div><dt className="inline text-ink-3">Buying trigger: </dt><dd className="inline">{s.buying_trigger}</dd></div>
              <div><dt className="inline text-ink-3">Decision maker: </dt><dd className="inline">{s.decision_maker}</dd></div>
            </dl>
            <ul className="mt-3 border-t border-line pt-3"><ClaimLine c={s.rationale} compact /></ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Personas({ c }: { c: ReportContent }) {
  return (
    <Section id="personas" title="Buyer personas" kicker="Who you'll talk to">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {c.personas.map((p, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <p className="font-medium">{p.title}</p>
            <div className="mt-3 space-y-3">
              <div><Label>Goals</Label><Bullets items={p.goals} /></div>
              <div><Label>Pains</Label><Bullets items={p.pains} /></div>
              <div><Label>Objections</Label><Bullets items={p.objections} /></div>
              <div><Label>Where to find them</Label><Bullets items={p.where_to_find} /></div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Problems({ c }: { c: ReportContent }) {
  return (
    <Section id="problems" title="Problem hypotheses" kicker="What to validate in customer conversations">
      <div className="space-y-4">
        {c.problems.map((p, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <p className="font-medium">{p.statement}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div><Label>Evidence for</Label><Claims items={p.supporting} compact empty="None found yet." /></div>
              <div><Label>Evidence against</Label><Claims items={p.against} compact empty="None found yet." /></div>
            </div>
            <p className="mt-3 text-[13px]"><Badge tone="trail">How to validate</Badge> <span className="ml-1 text-ink-2">{p.how_to_validate}</span></p>
          </div>
        ))}
      </div>
    </Section>
  );
}
