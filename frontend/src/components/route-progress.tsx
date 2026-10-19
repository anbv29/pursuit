"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Thin glass progress bar for in-app navigation. Starts when an internal link is
 * clicked, completes when the pathname changes. Pure DOM writes; no re-renders.
 */
export function RouteProgress() {
  const path = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      window.clearTimeout(timer.current);
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "scaleX(0.08)";
      requestAnimationFrame(() => {
        el.style.transition = "transform 8s cubic-bezier(0.1, 0.7, 0.2, 1)";
        el.style.transform = "scaleX(0.85)";
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const el = bar.current;
    if (!el || el.style.opacity !== "1") return;
    el.style.transition = "transform 200ms var(--ease-out), opacity 300ms ease 180ms";
    el.style.transform = "scaleX(1)";
    el.style.opacity = "0";
  }, [path]);

  return <div ref={bar} className="route-progress" style={{ opacity: 0, transform: "scaleX(0)" }} aria-hidden />;
}
