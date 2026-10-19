"use client";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Card, CardHeader, Field, Input, Notice } from "./ui";

type Usage = { monthly_limit_usd: string; estimated_usd: string; reserved_usd: string; remaining_usd: string;
  research_model: string; models: string[]; note: string; historical_report_estimate: { low: number; high: number; samples: number } | null;
  records: { id: string; model: string; status: string; estimated_usd: string | null; reserved_usd: string; created_at: string }[] };
const dollars = (value: string | number) => `$${Number(value).toFixed(4)}`;

export function UsagePanel({ path, owner, preview = false }: { path: string; owner?: boolean; preview?: boolean }) {
  const data = useApi<Usage>(`${path}/usage`);
  const [limit, setLimit] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const save = useAction(async () => {
    try { await api(`${path}/usage`, { method: "PATCH", json: { monthly_limit_usd: limit ?? data.data?.monthly_limit_usd, research_model: data.data?.research_model } }); setMessage("Budget saved."); await data.reload(); }
    catch (e) { setMessage(errorMessage(e)); }
  });
  if (data.error) return <Notice tone="bad">Could not load AI usage: {data.error.message}</Notice>;
  if (!data.data) return <p className="text-sm text-ink-3">Loading AI usage…</p>;
  const u = data.data, h = u.historical_report_estimate;
  if (preview) return <div className="rounded-lg bg-paper p-3 text-xs text-ink-2">
    <p>Remaining estimated monthly budget: {dollars(u.remaining_usd)}</p>
    <p className="mt-1">{h ? `Previous measured runs: ${dollars(h.low)}–${dollars(h.high)} across ${h.samples} reports. Your next report may differ.` : "No measured report cost yet. Token and search usage will be recorded as requests complete."}</p>
  </div>;
  return <Card><CardHeader title="AI safety settings" description="Internal cost estimates, not an extra charge. Plan credits and subscription prices are managed in Billing." /><div className="space-y-4 p-5">
    <p className="text-sm">Estimated this month: <b>{dollars(u.estimated_usd)}</b> · Reserved / unknown: <b>{dollars(u.reserved_usd)}</b> · Remaining: <b>{dollars(u.remaining_usd)}</b></p>
    {owner && <form onSubmit={(e: FormEvent) => { e.preventDefault(); void save.run(); }} className="grid gap-3 sm:grid-cols-2">
      <Field label="Monthly estimated-spend limit (USD)">{(id) => <Input id={id} type="number" min={0} max={1000} step="0.0001" value={limit ?? u.monthly_limit_usd} onChange={(e) => setLimit(e.target.value)} />}</Field>
      <Button type="submit" loading={save.pending}>Save usage settings</Button>
    </form>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <details><summary className="cursor-pointer text-sm font-medium text-trail">Recent AI requests</summary>
      <ul className="mt-3 divide-y divide-line text-xs">{u.records.map((row) => <li key={row.id} className="py-2">{new Date(row.created_at).toLocaleString()} · {row.status} · {row.estimated_usd === null ? `reserved ${dollars(row.reserved_usd)}` : dollars(row.estimated_usd)}</li>)}</ul>
    </details>
  </div></Card>;
}
