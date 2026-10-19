"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Tone } from "@/lib/labels";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-accent-ink shadow-[0_6px_18px_-8px_var(--accent)] hover:brightness-110 hover:shadow-[0_10px_24px_-10px_var(--accent)]",
  secondary: "surface text-ink hover:border-line-strong hover:bg-surface",
  ghost: "text-ink-2 hover:bg-[var(--inset)] hover:text-ink",
  danger: "surface text-danger hover:bg-danger-soft hover:border-danger/40",
};
const SIZE = { sm: "h-8 px-3 text-[13px] rounded-[10px]", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-6 text-base rounded-2xl" };

export function Button({
  variant = "primary", size = "md", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "press inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium",
        "transition-[background-color,border-color,box-shadow,filter,color,transform] duration-150 ease-[var(--ease-out)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        SIZE[size], BTN[variant], className,
      )}
    >
      {loading && <Spinner className="size-3.5" />}
      {children}
    </button>
  );
}

/** Square icon-only button. `label` is required: it becomes the accessible name and tooltip. */
export function IconButton({
  label, className, children, variant = "ghost", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "ghost" | "secondary" }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        "press grid size-9 shrink-0 place-items-center rounded-xl text-ink-2 transition-colors",
        variant === "ghost" ? "hover:bg-[var(--inset)] hover:text-ink" : "surface hover:text-ink",
        "disabled:cursor-not-allowed disabled:opacity-50", className,
      )}
    >
      {children}
    </button>
  );
}

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={cx("size-4 animate-spin", className)} aria-hidden />
);

const TONE: Record<Tone, string> = {
  neutral: "bg-[var(--inset)] text-ink-2",
  good: "bg-success-soft text-success",
  bad: "bg-danger-soft text-danger",
  flag: "bg-warning-soft text-warning",
  muted: "bg-[var(--inset)] text-ink-3",
  trail: "bg-accent-soft text-trail-strong",
  demo: "bg-demo-soft text-demo",
};

/** Small status pill. Sentence case, never all caps. */
export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold leading-5", TONE[tone])}>
      {children}
    </span>
  );
}
export const Pill = Badge;

export const DemoBadge = ({ label = "Demo data" }: { label?: string }) => (
  <Badge tone="demo" title="Synthetic or simulated. Not a real result.">{label}</Badge>
);

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return (
    <span aria-hidden className={cx("grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-trail-strong ring-1 ring-[var(--glass-border)]", className)}>
      {initials}
    </span>
  );
}

/** Determinate progress bar. Pass `segments` for a segmented look (e.g. staged work). */
export function Progress({ value, label, segments }: { value: number; label: string; segments?: number }) {
  const v = Math.max(0, Math.min(100, value));
  if (segments) {
    const filled = (v / 100) * segments;
    return (
      <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className="flex gap-1">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--inset)]">
            <span className="block h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out)]"
              style={{ transform: `scaleX(${Math.max(0, Math.min(1, filled - i))})` }} />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-[var(--inset)]">
      <div className="h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out)]" style={{ transform: `scaleX(${v / 100})` }} />
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("skeleton", className)} aria-hidden />;
