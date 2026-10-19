import Link from "next/link";
import { useId } from "react";

/** Pursuit mark: a trail of three ascending steps — hypothesis, evidence, decision. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  const grad = `pm${useId().replace(/:/g, "")}`;
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg font-display text-ink" aria-label="Pursuit home">
      <svg viewBox="0 0 24 24" className="size-7 drop-shadow-[0_4px_10px_var(--shadow)]" aria-hidden>
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-strong)" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="7.5" fill={`url(#${grad})`} />
        <rect x=".5" y=".5" width="23" height="23" rx="7" fill="none" stroke="white" strokeOpacity=".35" />
        <circle cx="7" cy="16.5" r="1.8" fill="var(--accent-ink)" opacity=".6" />
        <circle cx="12" cy="12" r="1.8" fill="var(--accent-ink)" opacity=".85" />
        <circle cx="17" cy="7.5" r="2.2" fill="var(--accent-ink)" />
        <path d="M7 16.5 12 12l5-4.5" stroke="var(--accent-ink)" strokeWidth="1.2" strokeDasharray="1.5 1.8" fill="none" opacity=".7" />
      </svg>
      {!compact && <span className="text-[19px] font-semibold tracking-[-0.04em]">Pursuit</span>}
    </Link>
  );
}
