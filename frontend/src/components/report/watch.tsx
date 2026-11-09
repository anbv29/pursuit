"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { watchSchema, watchAlertLabels } from "@/lib/watch";
import { ReceiptChange } from "../watch-alerts";
import { Button, Notice } from "../ui";

type Watch = z.infer<typeof watchSchema>;
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "Not checked yet";

function WatchEditor({ watch, path, owner, reload }: { watch: Watch; path: string; owner: boolean; reload: () => Promise<void> }) {
  const working = watch.checking || watch.queued;
  const [selected, setSelected] = useState(watch.claim_ids);
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async (enabled: boolean, reset_baseline = false) => {
    try { await api(path, { json: { enabled, claim_ids: enabled ? selected : watch.claim_ids, ...(reset_baseline ? { reset_baseline: true } : {}) } }); setError(null); await reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const check = useAction(async () => {
    try { await api(`${path}/check`, { json: {} }); setError(null); await reload(); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <div className="mt-4 space-y-4">
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
      <p>{watch.enabled ? "Watch enabled" : "Watch paused"}</p>
      <p>Last checked: {date(watch.last_checked_at)}</p>
      {watch.enabled && <p>Next check: {watch.next_check_at ? date(watch.next_check_at) : "Queued"}</p>}
    </div>
    {working && <p role="status" className="text-sm text-trail">A source check is queued or running. You can leave this page.</p>}
    {watch.overdue && <Notice tone="flag">This check is overdue. Checks resume when the service is running.</Notice>}
    {error && <Notice tone="bad">{error}</Notice>}
    {owner && <>
      {watch.claims.some(claim => claim.obsolete) && <Notice tone="flag">This report changed after the watch was created. Review the current report above and choose its claims before resetting the watch baseline. Earlier alert receipts remain in history.</Notice>}
      {watch.claims.length ? <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">Choose up to 5 claims across at most 4 sources</legend>
        {watch.claims.map(claim => <label key={claim.id} className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm">
          <input type="checkbox" checked={selected.includes(claim.id)} disabled={!selected.includes(claim.id) && selected.length >= 5}
            onChange={e => setSelected(current => e.target.checked ? [...current, claim.id] : current.filter(id => id !== claim.id))} />
          <span>{claim.text}<span className="mt-1 block text-xs text-ink-3">{claim.section.replace(/_/g, " ")} · {claim.source_ids.join(", ")}{claim.obsolete && " · Earlier watch needs review"}</span></span>
        </label>)}
      </fieldset> : <p className="text-sm text-ink-3">No source-linked claims are available to watch. Refresh this report with usable receipts first.</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!selected.length || working} loading={save.pending} onClick={() => save.run(true)}>{watch.enabled ? "Save watched claims" : "Enable weekly watch"}</Button>
        {watch.claims.some(claim => claim.obsolete) && <Button variant="secondary" disabled={!selected.length || working} loading={save.pending} onClick={() => save.run(true, true)}>Reset baseline after reviewing report</Button>}
        {watch.enabled && <>
          <Button variant="secondary" loading={check.pending} disabled={working || save.pending} onClick={() => check.run()}>Check sources now</Button>
          <Button variant="ghost" loading={save.pending} onClick={() => save.run(false)}>Pause watch</Button>
        </>}
      </div>
    </>}
    {watch.alerts.length > 0 && <details><summary className="cursor-pointer text-sm font-medium text-trail">Source check history ({watch.alerts.length})</summary>
      <ul className="mt-3 divide-y divide-line">{watch.alerts.map(alert => <li key={alert.id} className="space-y-2 py-4">
        <p className="text-sm font-semibold">{watchAlertLabels[alert.kind]}{alert.acknowledged_at && " · Reviewed"}</p>
        <ReceiptChange alert={alert} />
      </li>)}</ul>
    </details>}
  </div>;
}

export function ReportWatch({ path, owner }: { path: string; owner: boolean }) {
  const watchPath = `${path}/watch`;
  const state = useApi<unknown>(watchPath);
  const parsed = watchSchema.safeParse(state.data);
  const checking = parsed.success && (parsed.data.checking || parsed.data.queued);
  const enabled = parsed.success && parsed.data.enabled;
  const reload = state.reload;
  useEffect(() => {
    if (!enabled && !checking) return;
    const timer = setInterval(() => void reload(), checking ? 4000 : 60000);
    return () => clearInterval(timer);
  }, [enabled, checking, reload]);
  return <section id="report-watch" aria-labelledby="report-watch-title" className="scroll-mt-24 rounded-xl border border-line bg-surface p-5 print:hidden">
    <details>
    <summary className="cursor-pointer"><h2 id="report-watch-title" className="inline text-lg font-semibold">Watch the evidence behind this report</h2><span className="ml-2 text-xs text-ink-3">{checking ? "Checking" : enabled ? "Watching" : "Optional"}</span></summary>
    <p className="mt-2 text-sm text-ink-2">Get workspace alerts when cited evidence changes or becomes unavailable. A changed page needs review, it does not automatically disprove a claim.</p>
    <p className="mt-2 text-sm text-ink-2">Only claims with a supporting quotation and a usable source receipt are listed.</p>
    <p className="mt-2 text-xs text-ink-3">Weekly checks run while the service is available. Free hosting can sleep and delay checks. This watch sends no emails and does not monitor sources continuously.</p>
    {state.error && <Notice tone="bad">{errorMessage(state.error)} <button type="button" className="underline" onClick={() => state.reload()}>Try again</button></Notice>}
    {state.data === null && !state.error && <p role="status" className="mt-3 text-sm text-ink-3">Loading report watch…</p>}
    {state.data !== null && !parsed.success && <Notice tone="bad">This report watch could not be read. Please reload.</Notice>}
    {parsed.success && <WatchEditor key={JSON.stringify([parsed.data.enabled, parsed.data.claim_ids, parsed.data.claims.map(claim => claim.id)])} watch={parsed.data} path={watchPath} owner={owner} reload={state.reload} />}
    </details>
  </section>;
}
