"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readReduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Count-up number in mono type; static under prefers-reduced-motion. */
export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const reduce = useSyncExternalStore(subscribeReduce, readReduce, () => true);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) return;
    const dur = 800;
    let start: number | null = null;
    let raf = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span className={className}>{reduce ? value : shown}</span>;
}
