"use client";

import { ExternalLink } from "lucide-react";
import { useApi } from "@/lib/hooks";
import type { Evidence } from "@/lib/types";
import { Badge, Card, CardHeader, Empty } from "../ui";
import { useExperiment } from "./context";
import { EvidencePanel } from "./evidence";

const ASPECTS = ["pricing", "features", "audience", "positioning"];

/** Competitor matrix derived from evidence tagged `competitor:Name` (+ aspect tags). */
export function CompetitivePanel() {
  const { path, version } = useExperiment();
  const ev = useApi<Evidence[]>(`${path}/evidence`, version);

  const byCompetitor = new Map<string, Evidence[]>();
  for (const e of ev.data ?? []) {
    for (const t of e.tags) {
      if (t.toLowerCase().startsWith("competitor:")) {
        const name = t.slice(11).trim();
        byCompetitor.set(name, [...(byCompetitor.get(name) ?? []), e]);
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Competitor matrix" description="Built from evidence tagged competitor:Name plus pricing / features / audience / positioning. Gaps are shown, not guessed." />
        {byCompetitor.size === 0 ? (
          <Empty title="No competitors profiled yet" body="Add evidence below with a tag like competitor:Acme, pricing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2 font-medium">Competitor</th>
                  {ASPECTS.map((a) => <th key={a} scope="col" className="px-4 py-2 font-medium capitalize">{a}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...byCompetitor.entries()].map(([name, items]) => (
                  <tr key={name} className="align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium">{name}</th>
                    {ASPECTS.map((a) => {
                      const hits = items.filter((e) => e.tags.some((t) => t.toLowerCase() === a));
                      return (
                        <td key={a} className="px-4 py-3">
                          {hits.length === 0 ? <span className="text-xs italic text-ink-3">Unknown</span> : hits.map((e) => (
                            <div key={e.id} className="mb-1.5">
                              <p className="text-[13px]">{e.claim}</p>
                              <div className="flex items-center gap-1.5">
                                {e.stance === "contradicts" && <Badge tone="bad">contradicts</Badge>}
                                {e.source ? <a href={e.source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-0.5 text-[11px] text-ink-3 hover:text-trail"><ExternalLink className="size-3" />{new Date(e.source.retrieved_at).toLocaleDateString()}</a>
                                  : <span className="text-[11px] text-flag">unsourced</span>}
                              </div>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <EvidencePanel />
    </div>
  );
}
