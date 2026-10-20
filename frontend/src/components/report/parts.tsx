"use client";

import { ExternalLink } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import type { Claim, ReportSource } from "@/lib/types";
import { Badge, cx } from "../ui";
import { SECTION_HELP, SIMPLE_LABELS, useAdvanced } from "../reading-mode";

const SourcesCtx = createContext<Map<string, ReportSource>>(new Map());
export const SourcesProvider = ({ sources, children }: { sources: ReportSource[]; children: ReactNode }) => (
  <SourcesCtx.Provider value={new Map(sources.map((s) => [s.id, s]))}>{children}</SourcesCtx.Provider>
);

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Numbered citation chips; hover shows the page title, click opens the source. */
export function Cites({ ids }: { ids: string[] }) {
  const map = useContext(SourcesCtx);
  const found = ids.map((id) => map.get(id)).filter(Boolean) as ReportSource[];
  if (!found.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {found.slice(0, 4).map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer nofollow" title={s.title || s.url}
          className="inline-flex items-center gap-0.5 rounded bg-sunken px-1.5 py-px text-[11px] text-ink-2 hover:bg-trail-soft hover:text-trail-strong">
          {host(s.url)} <ExternalLink className="size-2.5" aria-hidden />
        </a>
      ))}
      {found.length > 4 && <span className="text-[11px] text-ink-3">+{found.length - 4}</span>}
    </span>
  );
}

const KIND = {
  fact: { label: "Sourced fact", tone: "good" as const },
  interpretation: { label: "Interpretation", tone: "neutral" as const },
  assumption: { label: "Assumption", tone: "flag" as const },
};

export function ClaimLine({ c, compact }: { c: Claim; compact?: boolean }) {
  const k = KIND[c.kind];
  return (
    <li className={cx("flex gap-2", compact ? "text-[13px]" : "text-sm")}>
      <span className={cx("mt-2 size-1.5 shrink-0 rounded-full", c.kind === "fact" ? "bg-trail" : c.kind === "assumption" ? "bg-flag" : "bg-ink-3")} aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere] text-ink">
        {c.text}
        <Cites ids={c.source_ids} />
        <span className="ml-1.5 inline-flex max-w-full flex-wrap gap-1 align-middle">
          <Badge tone={k.tone} title={c.unsourced ? "The model called this a fact, but cited no source we retrieved, so Pursuit downgraded it." : undefined}>
            {c.unsourced ? "Unsourced" : k.label}
          </Badge>
          {c.confidence !== "high" && <Badge tone="muted">{c.confidence} confidence</Badge>}
        </span>
      </span>
    </li>
  );
}

export function Claims({ items, compact, empty = "Nothing found." }: { items: Claim[]; compact?: boolean; empty?: string }) {
  if (!items.length) return <p className="text-sm italic text-ink-3">{empty}</p>;
  return <ul className="space-y-2">{items.map((c, i) => <ClaimLine key={i} c={c} compact={compact} />)}</ul>;
}

export function Bullets({ items, empty = "Nothing found." }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm italic text-ink-3">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm text-ink-2">
      {items.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" aria-hidden />{t}</li>)}
    </ul>
  );
}

export function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  const advanced = useAdvanced();
  const help = SECTION_HELP[id];
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 rounded-xl border border-line bg-surface p-6 shadow-card print:break-inside-avoid print:shadow-none">
      <h2 id={`${id}-h`} className="text-lg font-semibold tracking-tight">{!advanced && help?.[0] ? help[0] : title}</h2>
      {!advanced && help && <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-2">{help[1]}</p>}
      {advanced && kicker && <p className="mt-1 text-sm text-ink-3">{kicker}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const advanced = useAdvanced();
  return <p className="mb-1.5 text-xs font-medium text-ink-3">
    {!advanced && typeof children === "string" ? SIMPLE_LABELS[children] ?? children : children}
  </p>;
}
