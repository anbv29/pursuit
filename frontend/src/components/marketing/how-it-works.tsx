"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { HOW_IT_WORKS } from "@/lib/ui-demo/demo-data";
import { Glass, Tabs } from "../ui";
import styles from "./studio.module.css";

export function HowItWorks() {
  const [tab, setTab] = useState(HOW_IT_WORKS[0].id);
  const id = useId();
  const active = HOW_IT_WORKS.find((s) => s.id === tab) ?? HOW_IT_WORKS[0];
  const index = HOW_IT_WORKS.indexOf(active);
  return (
    <div className="space-y-5">
      <Tabs label="How Pursuit works" value={tab} onChange={setTab} className="mobile-process-tabs w-fit max-w-full" idPrefix={id} panelId={`${id}-panel`}
        tabs={HOW_IT_WORKS.map((s, i) => ({ id: s.id, label: <><span className="mr-1.5 tabular-nums">{i + 1}</span>{s.tab}</> }))} />
      <Glass role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${active.id}`} tabIndex={0} className={`process-panel ${styles.process}`}>
        <div key={active.id} className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
          <div>
            <p className={styles.step}>Step {index + 1} of {HOW_IT_WORKS.length}</p>
            <h3 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-[30px]">{active.title}</h3>
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
