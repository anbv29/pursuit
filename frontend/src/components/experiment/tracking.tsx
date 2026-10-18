"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { Button, Field, Input, Notice } from "../ui";

export function DeliveryTracking({ path, refresh }: { path: string; refresh: () => void }) {
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const sync = useAction(async () => {
    try {
      const result = await api<{ last_event: string }>(`${path}/tracking`, { json: { provider_message_id: id } });
      setStatus(result.last_event); setError(null); refresh();
    } catch (e) { setError(errorMessage(e)); }
  });
  return <details className="mt-3 text-sm"><summary className="cursor-pointer text-trail">Verify delivery from Resend</summary>
    <p className="my-2 text-xs text-ink-3">Requires a Resend connection configured for this workspace and an email sent through that account. The recipient and subject must match. Fo may use a different provider.</p>
    <Field label="Resend email ID">{(field) => <Input id={field} value={id} onChange={(e) => setId(e.target.value)} placeholder="Provider email UUID" />}</Field>
    <Button size="sm" variant="secondary" className="mt-2" disabled={!id} loading={sync.pending} onClick={() => sync.run()}>Verify and sync delivery</Button>
    {status && <p className="mt-2">Provider status: {status}</p>}
    {error && <Notice tone="bad">{error}</Notice>}
  </details>;
}
