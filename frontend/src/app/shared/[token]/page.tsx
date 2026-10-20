"use client";

import { plainCopy } from "@/lib/plain-copy";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/lib/hooks";
import type { ReportContent, ReportSource } from "@/lib/types";
import { Empty, Skeleton } from "@/components/ui";
import { ReadingControls } from "@/components/reading-mode";
import { SourcesProvider, Section } from "@/components/report/parts";
import { Summary, Snapshot, Segments, Personas, Problems } from "@/components/report/customer-sections";
import { Competitors, PositioningPricing, Messaging, Prospecting, FunnelRisks, Risks } from "@/components/report/market-sections";

function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const report = useApi<{ company_name: string; content: ReportContent; sources: ReportSource[]; expires_at: string }>(`/shared-reports/${token}`);
  if (report.error) return <Empty title="This report link is unavailable" body="It may have expired or been revoked. Ask its owner for a new link." />;
  if (!report.data) return <Skeleton className="mx-auto mt-12 h-64 max-w-4xl" />;
  const r = report.data, c = plainCopy(r.content);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <h1 className="text-2xl font-semibold">{r.company_name} · shared report</h1>
    <p className="text-sm text-ink-3">Read-only snapshot · link expires {new Date(r.expires_at).toLocaleString()}</p>
    <ReadingControls />
    <SourcesProvider sources={r.sources}>
      <Summary c={c} /><Snapshot c={c} /><Segments c={c} /><Personas c={c} /><Problems c={c} />
      <Competitors c={c} /><PositioningPricing c={c} /><Messaging c={c} /><Prospecting c={c} /><FunnelRisks c={c} />
      <Section id="experiments" title="Recommended tests"><ol className="list-decimal space-y-3 pl-5">{c.experiments.map((e, i) => <li key={i}><b>{e.title}</b><p className="text-sm">{e.hypothesis}</p></li>)}</ol></Section>
      <Risks c={c} />
      <Section id="sources" title="Sources"><ul className="space-y-2 break-words">{r.sources.map((s) => <li key={s.id}><a className="text-trail underline" href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title || s.url}</a></li>)}</ul></Section>
    </SourcesProvider>
  </main>;
}

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-64" />}><SharedReport /></Suspense>;
}
