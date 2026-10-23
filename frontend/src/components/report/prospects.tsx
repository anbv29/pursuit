"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Empty, Notice } from "../ui";
import { Section } from "./parts";

type Candidate = { id: string; payload: { company: string; website: string; rationale: string; verified_at: string; note: string; sources: { id: string; url: string; title: string }[] } };

export function ReportProspects({ path }: { path: string }) {
  const list = useApi<Candidate[]>(`${path}/prospects`);
  const [error, setError] = useState<string | null>(null);
  const discover = useAction(async () => {
    try { await api(`${path}/prospects/discover`, { method: "POST" }); setError(null); await list.reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <Section id="company-prospects" title="Find companies worth talking to">
    <p className="mb-3 text-sm text-ink-2">Research up to five organizations matching your target customer groups. Public website reachability is checked; fit is an AI interpretation and buying intent is unverified. Free to use. Results depend on accessible source evidence.</p>
    <Button loading={discover.pending} onClick={() => discover.run()}>Find company prospects</Button>
    {(error || list.error) && <Notice tone="bad">{error ?? list.error?.message}</Notice>}
    {list.data?.length ? <ul className="mt-4 divide-y divide-line">{list.data.map((row) => <li key={row.id} className="space-y-2 py-3">
      <a href={row.payload.website} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-trail">{row.payload.company}</a>
      <p className="text-sm">{row.payload.rationale}</p>
      <p className="text-xs text-ink-3">Website checked {new Date(row.payload.verified_at).toLocaleString()} · {row.payload.note}</p>
      <ul className="flex flex-wrap gap-3 text-xs">{row.payload.sources.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-trail underline">{s.title || s.url}</a></li>)}</ul>
    </li>)}</ul> : <Empty title="No saved company suggestions yet" body="Discovery saves only candidates with retrieved source links and a reachable public website." />}
  </Section>;
}
