"use client";

import { DECISION_STYLE, STAGE_LABEL } from "@/lib/labels";
import type { Decision, Rate, Stage } from "@/lib/types";
import { cx } from "./ui";
import { useAdvanced } from "./reading-mode";

const STAGES = Object.keys(STAGE_LABEL) as Stage[];

export function DecisionChip({ decision, size = "sm" }: { decision: Decision; size?: "sm" | "lg" }) {
  const advanced = useAdvanced();
  const simple = { CONTINUE: "Keep going", ITERATE: "Improve and retry", PIVOT: "Change direction", STOP: "Stop this test", INCONCLUSIVE: "Need more evidence" };
  const s = DECISION_STYLE[decision];
  return (
    <span className={cx("inline-flex items-center rounded-md font-semibold tracking-wide", s.className,
      size === "lg" ? "px-3 py-1.5 text-sm" : "px-1.5 py-0.5 text-[11px]")}>{advanced ? s.label : simple[decision]}</span>
  );
}

/** Compact 9-segment progress bar for the shared lifecycle. */
export function StageBar({ stage }: { stage: Stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-2" aria-label={`Stage ${idx + 1} of ${STAGES.length}: ${STAGE_LABEL[stage]}`}>
      <div className="flex gap-0.5" aria-hidden>
        {STAGES.map((s, i) => (
          <span key={s} className={cx("h-1.5 w-3 rounded-full", i < idx ? "bg-trail" : i === idx ? "bg-trail/50" : "bg-line")} />
        ))}
      </div>
      <span className="text-xs text-ink-3">{STAGE_LABEL[stage]}</span>
    </div>
  );
}

/** A rate with its denominator and 95% interval — never a bare percentage. */
export function RateView({ rate, label }: { rate: Rate; label?: string }) {
  const advanced = useAdvanced();
  if (rate.value === null) {
    return <span className="text-sm text-ink-3">No data yet{label ? ` for ${label}` : ""}</span>;
  }
  // Small rates get a decimal so 0.3% never reads as "0%".
  const d = rate.value < 0.1 ? 1 : 0;
  const p = (v: number | null) => ((v ?? 0) * 100).toFixed(d);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-base font-semibold tabular-nums">{p(rate.value)}%</span>
      <span className="text-xs tabular-nums text-ink-3">
        {rate.numerator.toLocaleString()}/{rate.denominator.toLocaleString()} · {advanced ? "95% CI" : "95% uncertainty range"} {p(rate.ci_low)}–{p(rate.ci_high)}%
      </span>
    </span>
  );
}

export function IntervalBar({ rate, target }: { rate: Rate; target?: number }) {
  if (rate.value === null) return <div className="h-2 rounded-full bg-sunken" aria-hidden />;
  const lo = (rate.ci_low ?? 0) * 100;
  const hi = (rate.ci_high ?? 0) * 100;
  return (
    <div className="relative h-2 rounded-full bg-sunken" aria-hidden>
      <div className="absolute inset-y-0 rounded-full bg-trail/25" style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 1)}%` }} />
      <div className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-trail" style={{ left: `${rate.value * 100}%` }} />
      {target !== undefined && (
        <div className="absolute -inset-y-1 w-px bg-ink-2" style={{ left: `${Math.min(target * 100, 100)}%` }} title={`Target ${Math.round(target * 100)}%`} />
      )}
    </div>
  );
}
