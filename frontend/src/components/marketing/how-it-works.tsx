"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { HOW_IT_WORKS } from "@/lib/ui-demo/demo-data";
import { Glass, Tabs } from "../ui";

/** Tabbed walkthrough of the product, with a matching tabpanel per step. */
export function HowItWorks() {
  const [tab, setTab] = useState(HOW_IT_WORKS[0].id);
  const id = useId();
  const active = HOW_IT_WORKS.find((s) => s.id === tab) ?? HOW_IT_WORKS[0];
  const index = HOW_IT_WORKS.indexOf(active);
  return (
    <div className="space-y-5">
      <Tabs label="How Pursuit works" value={tab} onChange={setTab} className="w-fit max-w-full" idPrefix={id} panelId={`${id}-panel`}
        tabs={HOW_IT_WORKS.map((s, i) => ({ id: s.id, label: <><span className="mr-1.5 tabular-nums text-ink-3">{i + 1}</span>{s.tab}</> }))} />
      <Glass role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${active.id}`} tabIndex={0} className="p-6 sm:p-9">
        <div key={active.id} className="enter-rise grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-[13px] font-semibold text-trail">Step {index + 1} of {HOW_IT_WORKS.length}</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-[28px]">{active.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{active.body}</p>
          </div>
          <ul className="space-y-2.5">
            {active.points.map((p) => (
              <li key={p} className="flex items-start gap-3 rounded-2xl bg-surface/80 px-4 py-3 text-sm text-ink ring-1 ring-line">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-trail-strong"><Check className="size-3" aria-hidden /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Glass>
    </div>
  );
}
