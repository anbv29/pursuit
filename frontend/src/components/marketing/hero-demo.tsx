"use client";

import { Check, Search } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HERO_DRAFT, HERO_MATCHES, HERO_REQUEST, HERO_SOURCES, HERO_STEPS } from "@/lib/ui-demo/demo-data";
import { CountUp, ScrambleText } from "../processing-feed";
import { Badge, cx, Glass, Progress, Skeleton } from "../ui";

const q = "(prefers-reduced-motion: reduce)";
const sub = (cb: () => void) => {
  const m = window.matchMedia(q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Illustrative product demo for the hero. Plays through the staged feed with
 * static example data, then shows the result; loops. Under reduced motion it
 * shows the finished state only.
 */
export function HeroDemo() {
  const reduced = useSyncExternalStore(sub, () => window.matchMedia(q).matches, () => false);
  const [tick, setTick] = useState(0);
  const total = HERO_STEPS.length + 3; // steps, then result shown for a few beats
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setTick((n) => (n + 1) % (total + 1)), 1500);
    return () => clearInterval(t);
  }, [reduced, total]);
  const step = reduced ? HERO_STEPS.length : Math.min(tick, HERO_STEPS.length);
  const done = step >= HERO_STEPS.length;

  return (
    <Glass className="w-full p-4 sm:p-5" aria-label="Example of Pursuit at work" role="img">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="neutral">Example</Badge>
        <span className="text-xs text-ink-3">{done ? "Ready" : "Working…"}</span>
      </div>
      <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-surface/80 px-3.5 py-3 ring-1 ring-line">
        <Search className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        <p className="text-[13.5px] leading-snug text-ink">{HERO_REQUEST}</p>
      </div>

      <div className="mt-4"><Progress value={(Math.min(step + (done ? 0 : 0.5), HERO_STEPS.length) / HERO_STEPS.length) * 100} segments={HERO_STEPS.length} label="Example progress" /></div>
      <ol className="mt-3 space-y-1.5">
        {HERO_STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
              <span className={cx("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                state === "done" ? "bg-accent-strong text-accent-ink" : state === "active" ? "bg-accent-soft text-trail-strong ring-2 ring-accent" : "bg-[var(--inset)] text-ink-3")}>
                {state === "done" ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span className={state === "todo" ? "text-ink-3" : "font-medium text-ink"}>
                {state === "active" ? <ScrambleText text={s.label} /> : state === "done" ? s.done : s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 min-h-[214px]">
        {done ? (
          <div key="result" className="enter-rise space-y-2.5">
            <p className="text-[13px] text-ink-2"><span className="font-display text-lg font-bold text-ink"><CountUp value={HERO_SOURCES} /></span> illustrative sources · fictional example</p>
            {HERO_MATCHES.map((m, i) => (
              <div key={m.who} className="enter-rise rounded-2xl bg-surface/85 p-3 ring-1 ring-line" style={{ "--i": i + 1 } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{m.who}</p>
                  <span className="flex gap-0.5" aria-label={`Fit ${m.fit} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cx("h-1.5 w-2.5 rounded-sm", n <= m.fit ? "bg-accent" : "bg-line")} />)}
                  </span>
                </div>
                <p className="text-xs text-ink-3">{m.where}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-2"><span className="font-semibold text-trail">Why they fit: </span>{m.why}</p>
              </div>
            ))}
            <div className="enter-rise rounded-2xl border border-dashed border-line-strong p-3" style={{ "--i": 3 } as React.CSSProperties}>
              <p className="text-xs font-semibold text-ink-3">Draft, waiting for your approval</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{HERO_DRAFT.subject}</p>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">{HERO_DRAFT.body}</p>
            </div>
          </div>
        ) : (
          <div key="loading" className="space-y-2.5" aria-hidden>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-[70px]" />
            <Skeleton className="h-12" />
          </div>
        )}
      </div>
    </Glass>
  );
}
