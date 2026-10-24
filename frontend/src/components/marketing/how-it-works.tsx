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
      <Tabs label="How Pursuit works" value={tab} onChange={setTab} className="mobile-process-tabs w-fit max-w-full" idPrefix={id} panelId={`${id}-panel`}
        tabs={HOW_IT_WORKS.map((s, i) => ({ id: s.id, label: <><span className="mr-1.5 tabular-nums text-ink-3">{i + 1}</span>{s.tab}</> }))} />
      <Glass role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${active.id}`} tabIndex={0} className="process-panel p-6 sm:p-9">
        <div key={active.id} className="enter-rise grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
          <div>
            <p className="font-ui text-xs font-semibold tracking-wide text-trail">0{index + 1} / THE PROCESS</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-[28px]">{active.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{active.body}</p>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {active.points.map((p) => (
              <li key={p} className="flex items-start gap-3 py-4 text-sm text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-trail-strong"><Check className="size-3.5" aria-hidden /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </Glass>
    </div>
  );
}
