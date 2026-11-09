"use client";

import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./styles";

/** Calm, readable surface for content. No backdrop blur (cheap, legible over anything). */
export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("surface min-w-0 rounded-[var(--panel-radius-lg)]", className)}>{children}</As>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5">
      <div className="min-w-0 flex-1 basis-48 break-words">
        <h2 className="font-display text-base font-semibold leading-snug text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      {action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Glass({ className, children, dense, as: As = "div", ...rest }: HTMLAttributes<HTMLElement> & {
  dense?: boolean; as?: "div" | "section" | "aside" | "header" | "nav" | "article";
}) {
  return <As className={cx("glass", dense && "glass-dense", className)} {...rest}>{children}</As>;
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center break-words px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-lg bg-accent-soft text-trail-strong ring-1 ring-[var(--glass-border)]">
        {icon ?? <Sparkles className="size-5" aria-hidden />}
      </div>
      <p className="font-ui text-base font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-3">{body}</p>
      {action && <div className="mt-5 max-w-full">{action}</div>}
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
    <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
      <div className="min-w-0 flex-1 basis-48 break-words">
        
        <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-3">{description}</p>}
        {eyebrow && <p className="mt-2 text-xs text-ink-3">{eyebrow}</p>}
      </div>
      {action && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
