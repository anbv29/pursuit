"use client";

import { ArrowUpRight, FileText, Globe2 } from "lucide-react";
import { useId, useState } from "react";
import { cx, Glass, Tabs } from "../ui";

const SECTIONS = [
  { id: "audience", label: "Customers", title: "Start with a narrower audience.",
    body: "Independent design studios may feel the cost of scattered client feedback most acutely. Start with teams managing several projects at once.",
    evidence: "Look for repeated complaints about revision rounds and approval delays.",
    caveat: "A plausible audience, not yet a validated customer segment.", next: "Interview five studio owners about their last delayed project." },
  { id: "competition", label: "Competition", title: "Your competition includes the workaround.",
    body: "A shared document, email thread or project board can solve enough of the problem. Compare the switching effort as carefully as the feature list.",
    evidence: "Check how teams collect feedback today and what they already pay for.",
    caveat: "Public feature lists cannot tell you why customers switch.", next: "Ask each studio to walk through its current feedback process." },
  { id: "next", label: "Next test", title: "Trade interest for a concrete commitment.",
    body: "Offer a small, paid pilot on one real project. Define the outcome together before building a broader product.",
    evidence: "Record an agreed price, budget owner and intended start date.",
    caveat: "Friendly feedback and purchase intent are different kinds of evidence.", next: "Invite three interview participants to a paid pilot." },
];

/** Original illustrative report; selection changes content without running research. */
export function HeroDemo() {
  const [selected, setSelected] = useState(SECTIONS[0].id);
  const id = useId();
  return (
    <div className="research-preview relative" role="region" aria-label="Example of Pursuit at work">
      <div className="mb-3 flex items-center justify-between gap-3 px-1 font-ui text-xs text-ink-3">
        <span className="inline-flex items-center gap-2"><FileText className="size-3.5" aria-hidden /> THE RESEARCH BRIEF</span>
        <span>Fictional example</span>
      </div>
      <Glass className="report-sheet overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-7">
          <div><p className="font-ui text-xs text-ink-3">COMPANY / 001</p><h2 className="mt-2 font-display text-2xl tracking-tight">A feedback tool for studios.</h2></div>
          <Globe2 className="mt-1 size-5 shrink-0 text-trail" aria-hidden />
        </div>
        <div className="px-5 pt-2 sm:px-7">
          <Tabs className="mobile-preview-tabs" label="Explore the example report" value={selected} onChange={setSelected} idPrefix={id} panelId={`${id}-panel`}
            tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))} />
        </div>
        <div className="grid px-5 pb-6 pt-5 sm:px-7">
          {SECTIONS.map((section) => <div key={section.id} role="tabpanel" id={selected === section.id ? `${id}-panel` : undefined}
            aria-labelledby={`${id}-${section.id}`} aria-hidden={selected !== section.id} tabIndex={selected === section.id ? 0 : -1}
            className={cx("col-start-1 row-start-1 transition-opacity duration-200", selected !== section.id && "invisible opacity-0")}>
            <p className="font-ui text-xs font-semibold text-trail">RESEARCH DIRECTION</p>
            <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight">{section.title}</h3>
            <p className="mt-3 text-[15px] leading-6 text-ink-2">{section.body}</p>
            <div className="my-5 border-l-2 border-accent pl-4">
              <p className="font-ui text-xs font-semibold text-ink">Evidence to look for</p>
              <p className="mt-1 text-sm leading-5 text-ink-2">{section.evidence}</p>
            </div>
            <p className="text-xs leading-5 text-ink-3">{section.caveat}</p>
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-sunken p-4">
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-trail" aria-hidden />
              <div><p className="font-ui text-xs font-semibold">YOUR NEXT MOVE</p><p className="mt-1 text-sm leading-5 text-ink-2">{section.next}</p></div>
            </div>
          </div>)}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-ink-3 sm:px-7">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden /> Illustrative content. Your report includes source links.
        </div>
      </Glass>
    </div>
  );
}
