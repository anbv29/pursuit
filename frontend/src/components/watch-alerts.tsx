"use client";

import Link from "next/link";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { watchAlertSchema, watchAlertLabels, type WatchAlert } from "@/lib/watch";
import { useWorkspace } from "./shell";
import { Button, Notice } from "./ui";

export function ReceiptChange({ alert }: { alert: WatchAlert }) {
  return <div className="space-y-3 text-sm">
    <p className="font-medium">{alert.claim_text}</p>
    {alert.reason && <p className="text-ink-2">{alert.reason}</p>}
    {alert.recommendation_refs.length > 0 && <p className="text-ink-2">Review the related recommendation: {alert.recommendation_refs.map(ref => ref.replace(/_/g, " ")).join(", ")}</p>}
    <p className="text-xs text-ink-3">Checked {new Date(alert.checked_at).toLocaleString()} · {alert.section.replace(/_/g, " ")}</p>
    <a href={/^https?:\/\//i.test(alert.source_url) ? alert.source_url : undefined} target="_blank" rel="noopener noreferrer" className="break-all text-trail underline">{alert.source_title || alert.source_url}</a>
    <details><summary className="cursor-pointer font-medium text-trail">Compare the receipts</summary>
      <p className="mt-2 text-xs text-ink-3">Earlier receipt: {alert.previous_retrieved_at ? new Date(alert.previous_retrieved_at).toLocaleString() : "date not recorded"} · Latest retrieval: {alert.current_retrieved_at ? new Date(alert.current_retrieved_at).toLocaleString() : "not available"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><p className="mb-1 font-medium">Earlier evidence</p><blockquote className="whitespace-pre-wrap break-words border-l-2 border-line pl-3 text-ink-2">{alert.previous_excerpt || "No earlier excerpt recorded."}</blockquote></div>
        <div><p className="mb-1 font-medium">Latest check</p><blockquote className="whitespace-pre-wrap break-words border-l-2 border-line pl-3 text-ink-2">{alert.current_excerpt || "The source could not be read. This does not disprove the claim."}</blockquote></div>
      </div>
    </details>
  </div>;
}

export function WatchAlerts() {
  const { workspace, base } = useWorkspace();
  const path = `/workspaces/${workspace.id}/watch-alerts`;
  const history = useApi<unknown>(path);
  const parsed = watchAlertSchema.array().safeParse(history.data);
  const [error, setError] = useState<string | null>(null);
  const acknowledge = useAction(async (id: string) => {
    try { await api(`${path}/${id}`, { method: "PATCH", json: { acknowledged: true } }); setError(null); await history.reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const pending = parsed.success ? parsed.data.filter(alert => !alert.acknowledged_at) : [];
  return <section aria-labelledby="watch-alerts-title" className="space-y-3 rounded-xl border border-line bg-surface p-5">
    <h2 id="watch-alerts-title" className="font-semibold">Research alerts {pending.length > 0 && `(${pending.length})`}</h2>
    <p className="text-sm text-ink-2">Changes to evidence behind reports you watch. Review the receipts before changing your decision.</p>
    {history.loading && <p role="status" className="text-sm text-ink-3">Loading research alerts…</p>}
    {(error || history.error) && <Notice tone="bad">{error || errorMessage(history.error)}</Notice>}
    {history.data !== null && !parsed.success && <Notice tone="bad">Research alerts could not be read. Please reload.</Notice>}
    {parsed.success && !pending.length && <p className="text-sm text-ink-3">No research alerts need review. Enable a watch from a finished report.</p>}
    <ul className="divide-y divide-line">{pending.map(alert => <li key={alert.id} className="space-y-3 py-4">
      <p className="font-semibold">{watchAlertLabels[alert.kind]}</p>
      <ReceiptChange alert={alert} />
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`${base}/reports/${alert.report_id}#report-watch`} className="text-sm font-medium text-trail underline">Review {alert.company_name || "report"}</Link>
        <Button size="sm" variant="secondary" loading={acknowledge.pending} onClick={() => acknowledge.run(alert.id)}>Mark reviewed</Button>
      </div>
    </li>)}</ul>
  </section>;
}
