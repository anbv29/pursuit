"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const DONE_KEY = "pursuit.loaderDone";
const LENS = 190;

/**
 * First-visit overlay: the word "Pursuit" sits blurred; a glass lens follows the
 * pointer and reveals it sharp. Progress charges on its own (faster while
 * pressed); at 100% the overlay dissolves and never replays this session.
 *
 * Every frame writes styles straight to the DOM (no React state per frame).
 * window / sessionStorage / matchMedia are only read inside effects so server
 * and client render the same markup.
 */
const noop = () => () => {};
function eligible(): boolean {
  try {
    if (sessionStorage.getItem(DONE_KEY) === "1") return false;
  } catch {
    /* storage blocked: still show once */
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LensLoader() {
  // Server snapshot is false, so server and client hydrate identical markup.
  const canShow = useSyncExternalStore(noop, eligible, () => false);
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const show = canShow && !gone;
  const rootRef = useRef<HTMLDivElement>(null);
  const sharpRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const finish = useRef<() => void>(() => {});

  useEffect(() => {
    if (!show) return;
    const root = rootRef.current!;
    const sharp = sharpRef.current!;
    const lens = lensRef.current!;
    const ring = ringRef.current!;
    const pct = pctRef.current!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let target = { x: w / 2, y: h / 2 };
    const pos = { x: w / 2, y: h / 2 };
    let pressed = false;
    let progress = 0;
    let raf = 0;
    let doneAt = 0;
    let ended = false;

    const end = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      setLeaving(true);
      window.setTimeout(() => {
        try {
          sessionStorage.setItem(DONE_KEY, "1");
        } catch {
          /* storage unavailable: it will simply show again next visit */
        }
        setGone(true);
      }, 900);
    };
    finish.current = end;

    const onMove = (e: PointerEvent) => {
      target = { x: e.clientX, y: e.clientY };
    };
    const onDown = (e: PointerEvent) => {
      pressed = true;
      target = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      pressed = false;
    };
    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
    };

    const frame = (t: number) => {
      pos.x += (target.x - pos.x) * 0.14;
      pos.y += (target.y - pos.y) * 0.14;
      progress = Math.min(100, progress + (pressed ? 0.9 : 0.22));
      const r = 95 + Math.pow(progress / 100, 3) * Math.hypot(w, h);

      sharp.style.clipPath = `circle(${r.toFixed(1)}px at ${pos.x.toFixed(1)}px ${pos.y.toFixed(1)}px)`;
      lens.style.transform = `translate3d(${pos.x - LENS / 2}px, ${pos.y - LENS / 2}px, 0) scale(${pressed ? 0.88 : 1})`;
      ring.style.background = `conic-gradient(var(--accent) ${(progress * 3.6).toFixed(1)}deg, transparent 0)`;
      pct.textContent = `${Math.floor(progress)}%`;

      if (progress >= 100) {
        if (!doneAt) doneAt = t;
        if (t - doneAt >= 250) return end();
      }
      raf = requestAnimationFrame(frame);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, [show]);

  if (!show) return null;
  return (
    <div ref={rootRef} className="lens-loader" data-leaving={leaving} role="dialog" aria-modal="true" aria-label="Loading Pursuit">
      <div className="lens-word lens-word-blur" aria-hidden>Pursuit</div>
      <div ref={sharpRef} className="lens-word lens-word-sharp" aria-hidden>Pursuit</div>
      <div ref={lensRef} className="lens" aria-hidden>
        <div ref={ringRef} className="lens-ring" />
        <span ref={pctRef} className="lens-pct">0%</span>
      </div>
      <div className="lens-footer">
        <p>Move the lens to bring the page into focus. Press and hold to charge it.</p>
        <button type="button" className="lens-skip press" onClick={() => finish.current()} autoFocus>
          Skip
        </button>
      </div>
    </div>
  );
}
