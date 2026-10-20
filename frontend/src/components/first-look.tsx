"use client";

import { ArrowRight, Globe, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FreeReportContent, type FreeContent } from "@/components/free-report-content";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, Field, Input, Notice, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";

type Preview = {
  title: string; source_url: string; retrieved_at: string; excerpt: string;
  content: FreeContent; limitations: string;
};
type Status = { used: boolean; available: boolean; status: string | null; can_retry: boolean; updated_check_available?: boolean; preview: Preview | null; error: string | null; experiment_id: string | null };

export function FirstLookPanel() {
  const { workspace } = useWorkspace();
  return <FirstLookForm key={workspace.id} />;
}

function FirstLookForm() {
  const { workspace, base } = useWorkspace();
  const path = `/workspaces/${workspace.id}/first-look`;
  const saved = useApi<Status>(workspace.role === "owner" ? path : null);
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useAction(async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let parsed: URL;
    try { parsed = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`); }
    catch { setError("Enter a public website, such as example.com."); return; }
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      setError("Use a public HTTP or HTTPS website without credentials."); return;
    }
    try { await api(path, { json: { company_url: parsed.href, audience: audience.trim(), description: description.trim() } }); }
    catch (e) { setError(errorMessage(e)); }
    await saved.reload();
  });
  const data = saved.data;
  const result = data?.preview;
  const running = run.pending || (data?.status === "RUNNING" && !data.can_retry);

  return <div className="mx-auto max-w-3xl space-y-6">
    <header><p className="mb-3 font-ui text-xs font-semibold uppercase tracking-widest text-trail">A first step, on us</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Website First Look</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">Try Pursuit with your actual website. Get the first four sections of your research: an executive summary, company snapshot, potential customers and personas.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Badge>Free · once per account</Badge><Badge>No card needed</Badge></div>
    </header>
    <Notice tone="trail">Your free preview uses your public page and optional description. It is a starting point for research, not proof of demand. The remaining report sections are included in paid plans.</Notice>
    {workspace.role !== "owner" ? <Notice tone="flag">The project owner can run their free first look.</Notice>
      : saved.loading && !data ? <Skeleton className="h-48" /> : <>
        {(error || saved.error) && <Notice tone="bad">{error ?? saved.error?.message}</Notice>}
        {data?.error && !error && <Notice tone="flag"><p className="font-semibold">Let’s try a different page</p><p className="mt-1">{data.error}</p></Notice>}
        {data?.updated_check_available && <Notice tone="trail">Your earlier website check can now be replaced with a free four-section research preview.</Notice>}
        {data && !data.available && !result && <Notice tone="flag">Free previews are temporarily unavailable. Your allowance is unchanged. You can still explore the sample report and manual experiments.</Notice>}
        <div className="flex justify-end"><Button size="sm" variant="ghost" disabled={saved.loading || run.pending} onClick={() => void saved.reload()}><RefreshCw className="size-4" aria-hidden />Refresh status</Button></div>
        {!data?.used && <form onSubmit={event => void run.run(event)} className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <Field label="Your website">{id => <Input id={id} required maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="example.com" disabled={!!running} />}</Field>
          <Field label="What does your company do?" hint="Optional. Your description helps add context; it is not treated as independent evidence.">{id => <Input id={id} maxLength={1500} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the product and the problem it solves" disabled={!!running} />}</Field>
          <Field label="Who do you think this helps?" hint="Optional. This is your assumption, not a validated customer segment.">{id => <Input id={id} maxLength={300} value={audience} onChange={event => setAudience(event.target.value)} placeholder="For example, independent shop owners" disabled={!!running} />}</Field>
          <p className="text-sm text-ink-3">One free research preview per account. Failed requests don’t consume your preview; retries are limited. Only your public page text and these optional details are shared with our AI provider.</p>
          <Button type="submit" disabled={!data || !data.available || !!running || !url.trim() || workspace.is_demo}>{running ? "Writing your preview…" : data?.can_retry ? "Retry free first look" : "Get my free first look"}<ArrowRight className="size-4" aria-hidden /></Button>
          {running && <p className="text-sm text-ink-2" role="status">If this takes too long, refresh the status. A stalled check can be retried after three minutes.</p>}
        </form>}
        {data?.used && !result && <Notice tone="flag">Your account’s free first look has already been used in another project. Paid research credits are separate.</Notice>}
        {result && <>
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3"><Globe className="mt-1 size-5 shrink-0 text-trail" aria-hidden /><div className="min-w-0"><h2 className="break-words font-display text-xl font-semibold">{result.title}</h2><a className="mt-1 inline-block break-all text-sm text-trail underline" href={result.source_url} target="_blank" rel="noopener noreferrer">View checked page</a><p className="mt-1 text-xs text-ink-3">Retrieved {new Date(result.retrieved_at).toLocaleString()}</p></div></div>
          </section>
          <FreeReportContent content={result.content} />
          <section className="flex flex-col items-start gap-4 rounded-2xl bg-sunken p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Ready for the wider picture?</h2><p className="mt-1 text-sm text-ink-2">Unlock the remaining research: competitors, positioning, pricing, messaging and a practical first-week plan.</p></div><Link className="shrink-0 font-ui text-sm font-semibold text-trail underline underline-offset-4" href={`${base}/billing`}>See paid plans →</Link></section>
        </>}
      </>}
  </div>;
}
