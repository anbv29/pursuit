import Link from "next/link";

/** Pursuit mark: a trail of three ascending steps — hypothesis, evidence, decision. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink" aria-label="Pursuit home">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect width="24" height="24" rx="7" fill="var(--trail)" />
        <circle cx="7" cy="16.5" r="1.8" fill="#fff" opacity=".55" />
        <circle cx="12" cy="12" r="1.8" fill="#fff" opacity=".8" />
        <circle cx="17" cy="7.5" r="2.2" fill="#fff" />
        <path d="M7 16.5 12 12l5-4.5" stroke="#fff" strokeWidth="1.2" strokeDasharray="1.5 1.8" fill="none" opacity=".7" />
      </svg>
      {!compact && <span className="text-[17px]">Pursuit</span>}
    </Link>
  );
}
