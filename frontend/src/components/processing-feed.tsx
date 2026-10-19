"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx, Progress, Skeleton } from "./ui";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => true);

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Label that resolves from scrambled glyphs into its text. Processing states only. */
export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let frame = 0;
    let raf = 0;
    const total = Math.min(28, text.length + 8);
    const tick = () => {
      frame += 1;
      const settled = Math.floor((frame / total) * text.length);
      el.textContent = text
        .split("")
        .map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[(i * 7 + frame * 3) % GLYPHS.length]))
        .join("");
      if (frame < total) raf = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduced]);
  // Screen readers get the real text once; the visual scramble is hidden from them.
  return (
    <span className={className}>
      <span ref={ref} aria-hidden>{text}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Counts up to a real value. Processing states only. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = from.current;
    from.current = value;
    if (reduced || start === value) { el.textContent = String(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <span ref={ref} className="tabular-nums">{value}</span>;
}

/** Elapsed time since a real timestamp. */
export function Elapsed({ since }: { since: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!since) return null;
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

export type FeedStep = { label: string; done: string };

/**
 * Staged processing feed. `current` is the index of the running step (derived from
 * real status by the caller); `detail` is the live progress line from the server.
 */
export function ProcessingFeed({ steps, current, detail, count, countLabel }: {
  steps: FeedStep[]; current: number; detail?: string; count?: number; countLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <Progress value={((current + 0.5) / steps.length) * 100} segments={steps.length} label="Report progress" />
      <ol className="space-y-2.5" aria-label="Steps">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s.label} className={cx("flex items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors duration-300",
              state === "active" && "bg-surface ring-1 ring-line shadow-[0_8px_24px_-16px_var(--shadow)]")}>
              <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                state === "done" ? "bg-accent-strong text-accent-ink" : state === "active" ? "bg-accent-soft text-trail-strong ring-2 ring-accent" : "bg-[var(--inset)] text-ink-3")}>
                {state === "done" ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("block text-sm", state === "todo" ? "text-ink-3" : "font-semibold text-ink")}>
                  {state === "active" ? <ScrambleText text={s.label} /> : state === "done" ? s.done : s.label}
                </span>
                {state === "active" && detail && <span className="mt-0.5 block text-[13px] text-ink-2">{detail}</span>}
              </span>
              <span className="sr-only">{state === "done" ? "Done" : state === "active" ? "In progress" : "Not started"}</span>
            </li>
          );
        })}
      </ol>
      {count !== undefined && count > 0 && (
        <p className="text-sm text-ink-2"><span className="font-ui text-xl font-semibold text-ink"><CountUp value={count} /></span> {countLabel}</p>
      )}
      <div className="space-y-2.5 rounded-2xl border border-dashed border-line p-4" aria-hidden>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="grid grid-cols-3 gap-2 pt-1"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      </div>
    </div>
  );
}
