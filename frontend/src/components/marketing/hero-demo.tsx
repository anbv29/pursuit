"use client";

import { ArrowUpRight } from "lucide-react";
import { useId, useState } from "react";
import { cx, Glass, Tabs } from "../ui";
import styles from "./preview.module.css";

const SECTIONS = [
  { id: "audience", label: "Sourced", title: "Team scheduling adds coordination.",
    body: "Cal.com lists shared availability, round-robin scheduling and routing forms in its team plan.",
    evidence: "Receipt S1, Cal.com pricing. Open the full brief to inspect the source.",
    caveat: "Vendor product information, not independent proof of customer results.", next: "Check the evidence before adopting the conclusion." },
  { id: "competition", label: "Interpretation", title: "The upgrade story changes with team size.",
    body: "The public plans suggest a progression from individual scheduling to team coordination and governance.",
    evidence: "An interpretation of the plan structure, linked to S1.",
    caveat: "This does not establish why customers upgrade.", next: "Ask teams what actually triggered their last upgrade." },
  { id: "next", label: "Unverified", title: "Handoff pain is a hypothesis.",
    body: "Small sales teams losing meetings during handoffs may be worth interviewing first.",
    evidence: "No customer evidence collected for this hypothesis.",
    caveat: "Low confidence. Do not treat this segment as validated.", next: "Interview five teams and record evidence against the idea too." },
];

export function HeroDemo() {
  const [selected, setSelected] = useState(SECTIONS[0].id);
  const id = useId();
  return (
    <div className={styles.preview} role="region" aria-label="Example of Pursuit at work">
      <Glass className={styles.sheet}>
        <div className={styles.heading}>
          <div><p>Research brief · Public sample</p><h2>Cal.com, with receipts.</h2></div>
          <span className={styles.mark} aria-hidden />
        </div>
        <div className={styles.tabs}>
          <Tabs className="mobile-preview-tabs" label="Explore the example report" value={selected} onChange={setSelected} idPrefix={id} panelId={`${id}-panel`}
            tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))} />
        </div>
        <div className={styles.panels}>
          {SECTIONS.map((section) => <div key={section.id} role="tabpanel" id={selected === section.id ? `${id}-panel` : undefined}
            aria-labelledby={`${id}-${section.id}`} aria-hidden={selected !== section.id} tabIndex={selected === section.id ? 0 : -1}
            className={cx(styles.panel, selected !== section.id && "invisible")}>
            <h3>{section.title}</h3>
            <p className={styles.body}>{section.body}</p>
            <div className={styles.receipt}>
              <span aria-hidden>{section.id === "next" ? "?" : "S1"}</span>
              <div><strong>Evidence status</strong><p>{section.evidence}</p></div>
            </div>
            <p className={styles.caveat}>{section.caveat}</p>
            <div className={styles.next}>
              <strong>Your next move</strong><p>{section.next}</p>
            </div>
          </div>)}
        </div>
        <div className={styles.reviewed}>
          Sources reviewed November 7, 2026.
        </div>
      </Glass>
      <a href="/sample" className={styles.fullBrief}>Open the full public brief<ArrowUpRight className="size-4" aria-hidden /></a>
    </div>
  );
}
