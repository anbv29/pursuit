"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { useFeedback } from "../feedback";
import { Button, Field, Input, Notice } from "../ui";

type Share = { id: string; expires_at: string; revoked_at: string | null };

export function ReportSharing({ path }: { path: string }) {
  const shares = useApi<Share[]>(`${path}/shares`);
  const { confirm } = useFeedback();
  const [days, setDays] = useState(7);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useAction(async () => {
    if (!await confirm({ title: "Create a read-only report link?", body: "Anyone with the link can read this report, its GTM strategy, budget and resource assumptions, and cited sources until it expires or you revoke it. It is a snapshot; later report changes are not included. Review the report for private company information first.", confirm: "Create share link" })) return;
    try { const share = await api<{ url: string }>(`${path}/shares`, { json: { expires_days: days } }); setUrl(share.url); setError(null); await shares.reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const revoke = useAction(async (id: string) => {
    try { await api(`${path}/shares/${id}`, { method: "DELETE" }); setUrl(""); await shares.reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <details className="rounded-lg border border-line bg-surface p-4 print:hidden">
    <summary className="cursor-pointer font-medium text-trail">Share a read-only snapshot</summary>
    <div className="mt-3 space-y-3">
      <Field label="Link expires after this many days">{(id) => <Input id={id} type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />}</Field>
      <Button loading={create.pending} onClick={() => create.run()}>Create share link</Button>
      {url && <Field label="Copy your share link (shown only now)">{(id) => <Input id={id} readOnly value={url} onFocus={(e) => e.target.select()} />}</Field>}
      {shares.data?.map((share) => <div key={share.id} className="flex items-center justify-between gap-2 text-sm">
        <p>{share.revoked_at ? "Revoked" : `Expires ${new Date(share.expires_at).toLocaleString()}`}</p>
        {!share.revoked_at && <Button size="sm" variant="secondary" loading={revoke.pending} onClick={() => revoke.run(share.id)}>Revoke link</Button>}
      </div>)}
      {(error || shares.error) && <Notice tone="bad">{error ?? shares.error?.message}</Notice>}
    </div>
  </details>;
}
