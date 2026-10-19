"use client";

import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cx } from "./core";

/** Calm, readable surface for content. No backdrop blur (cheap, legible over anything). */
export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("surface rounded-[var(--radius-lg)]", className)}>{children}</As>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Liquid-glass panel for chrome and focal surfaces (nav, hero, dialogs, empty states).
 * The specular highlight follows the pointer via a transform on one small layer,
 * throttled with requestAnimationFrame and ignored for touch.
 */
export function Glass({ className, children, dense, as: As = "div", ...rest }: HTMLAttributes<HTMLElement> & {
  dense?: boolean; as?: "div" | "section" | "aside" | "header" | "nav" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const sheen = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const dot = sheen.current;
    if (!el || !dot) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <As ref={ref as never} className={cx("glass", dense && "glass-dense", className)} {...rest}>
      <span className="glass-sheen" aria-hidden><span ref={sheen} /></span>
      {children}
    </As>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent-soft text-trail-strong ring-1 ring-[var(--glass-border)]">
        {icon ?? <Sparkles className="size-5" aria-hidden />}
      </div>
      <p className="font-display text-base font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-3">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export const EmptyState = Empty;

const NOTICE = {
  flag: { cls: "border-warning/30 bg-warning-soft text-warning", Icon: AlertTriangle },
  demo: { cls: "border-demo/25 bg-demo-soft text-demo", Icon: Info },
  trail: { cls: "border-accent/30 bg-accent-soft text-trail-strong", Icon: CheckCircle2 },
  bad: { cls: "border-danger/30 bg-danger-soft text-danger", Icon: AlertTriangle },
};

export function Notice({ tone = "flag", children }: { tone?: keyof typeof NOTICE; children: ReactNode }) {
  const { cls, Icon } = NOTICE[tone];
  return (
    <div role="status" className={cx("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed", cls)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Title + description on the left, primary action on the right. */
export function PageHeader({ title, description, action, eyebrow }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[13px] font-medium text-trail">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-ink-3">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
