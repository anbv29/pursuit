import Link from "next/link";

/** Pursuit mark: a trail of three ascending steps, hypothesis, evidence, decision. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg font-ui text-ink" aria-label="Pursuit home">
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
        <rect width="24" height="24" rx="7.5" fill="var(--accent)" />
        <rect x=".5" y=".5" width="23" height="23" rx="7" fill="none" stroke="white" strokeOpacity=".35" />
        <circle cx="7" cy="16.5" r="1.8" fill="var(--primary-ink)" opacity=".6" />
        <circle cx="12" cy="12" r="1.8" fill="var(--primary-ink)" opacity=".85" />
        <circle cx="17" cy="7.5" r="2.2" fill="var(--primary-ink)" />
        <path d="M7 16.5 12 12l5-4.5" stroke="var(--primary-ink)" strokeWidth="1.2" strokeDasharray="1.5 1.8" fill="none" opacity=".7" />
      </svg>
      {!compact && <span className="text-[19px] font-semibold tracking-[-0.04em]">Pursuit</span>}
    </Link>
  );
}
