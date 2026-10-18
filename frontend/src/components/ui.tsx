"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import type { Tone } from "@/lib/labels";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<Variant, string> = {
  primary: "bg-trail text-white hover:bg-trail-strong shadow-card",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-sunken/60",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-surface text-d-stop border border-line hover:bg-flag-soft",
};

export function Button({
  variant = "primary", size = "md", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
        BTN[variant], className,
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const FIELD = "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-trail focus:outline-none aria-[invalid=true]:border-d-stop";

export function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode;
}) {
  const id = useId();
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">{label}</label>
      {children(id, desc)}
      {error ? <p id={desc} className="text-xs text-d-stop">{error}</p>
        : hint ? <p id={desc} className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(FIELD, "h-9", className)} />
);
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(FIELD, "min-h-20 py-2 leading-relaxed", className)} />
);
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(FIELD, "h-9 pr-8", className)} />
);

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-xl border border-line bg-surface shadow-card", className)}>{children}</As>;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  good: "bg-trail-soft text-d-continue",
  bad: "bg-flag-soft text-d-stop",
  flag: "bg-flag-soft text-flag",
  muted: "bg-sunken text-ink-3",
  trail: "bg-trail-soft text-trail-strong",
  demo: "bg-demo-soft text-demo",
};

export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide", TONE[tone])}>
      {children}
    </span>
  );
}

export const DemoBadge = ({ label = "Demo data" }: { label?: string }) => (
  <Badge tone="demo" title="Synthetic or simulated. Not a real result.">{label}</Badge>
);

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-3 grid size-10 place-items-center rounded-full bg-sunken text-ink-3">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-ink-3">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("skeleton", className)} aria-hidden />;

export function Notice({ tone = "flag", children }: { tone?: "flag" | "demo" | "trail" | "bad"; children: ReactNode }) {
  const map = { flag: "border-flag/30 bg-flag-soft text-flag", demo: "border-demo/25 bg-demo-soft text-demo", trail: "border-trail/25 bg-trail-soft text-trail-strong", bad: "border-d-stop/30 bg-flag-soft text-d-stop" };
  return <div role="status" className={cx("rounded-lg border px-3 py-2 text-[13px]", map[tone])}>{children}</div>;
}
