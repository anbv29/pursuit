"use client";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Field, Notice, Textarea } from "../ui";
import { Section } from "./parts";

const SECTIONS = ["executive_summary", "snapshot", "segments", "personas", "problems", "competitors", "positioning", "pricing", "messaging", "prospecting", "funnel_risks", "experiments", "risks_and_unknowns", "focus_first"];
type Version = { id: string; created_at: string; payload: { note: string } };
type Changes = { changed_sections: { section: string; before: unknown; after: unknown }[] };

export function ReportVersions({ path, refresh }: { path: string; refresh: () => void }) {
  const history = useApi<Version[]>(`${path}/versions`);
  const [correction, setCorrection] = useState("");
  const [sections, setSections] = useState(["snapshot", "pricing"]);
  const [changes, setChanges] = useState<Changes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useAction(async () => {
    try { await api(`${path}/refresh`, { json: { correction, sections } }); setError(null); refresh(); }
    catch (e) { setError(errorMessage(e)); }
  });
  const compare = useAction(async (id: string) => {
    try { setChanges(await api<Changes>(`${path}/versions/${id}/compare`)); }
    catch (e) { setError(errorMessage(e)); }
  });
  return <Section id="versions" title="Correct facts and refresh your report">
    <p className="mb-3 text-sm text-ink-2">Add corrections and choose sections to update. The earlier report is saved first. A completed refresh uses one research credit and needs Founder or Team.</p>
    <Field label="Company facts to correct">{(id) => <Textarea id={id} maxLength={3000} value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="For example: our price is $29/month, and we sell to small clinics." />}</Field>
    <fieldset className="my-4 grid gap-2 sm:grid-cols-2"><legend className="mb-2 text-sm font-medium">Sections to refresh</legend>
      {SECTIONS.map((section) => <label key={section} className="flex gap-2 text-sm"><input type="checkbox" checked={sections.includes(section)} onChange={(e) => setSections((s) => e.target.checked ? [...s, section] : s.filter((v) => v !== section))} />{section.replace(/_/g, " ")}</label>)}
    </fieldset>
    <Button loading={save.pending} disabled={!sections.length} onClick={() => save.run()}>Save version and refresh selected sections</Button>
    {error && <Notice tone="bad">{error}</Notice>}
    <ul className="mt-4 divide-y divide-line">{history.data?.map((v) => <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span>{new Date(v.created_at).toLocaleString()} · {v.payload.note}</span>
      <Button variant="secondary" size="sm" loading={compare.pending} onClick={() => compare.run(v.id)}>Compare with current report</Button>
    </li>)}</ul>
    {changes && <div className="mt-3 space-y-2">{changes.changed_sections.length ? changes.changed_sections.map((change) =>
      <details key={change.section}><summary className="cursor-pointer font-medium">{change.section.replace(/_/g, " ")}</summary>
        <div className="grid gap-3 md:grid-cols-2">{[["Before", change.before], ["Now", change.after]].map(([label, value]) =>
          <div key={String(label)} className="min-w-0"><p className="my-2 text-xs text-ink-3">{String(label)}</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-paper p-3 text-xs">{JSON.stringify(value, null, 2)}</pre></div>)}</div>
      </details>) : <p className="text-sm text-ink-3">No report sections changed.</p>}</div>}
  </Section>;
}
