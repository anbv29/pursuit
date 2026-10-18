"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { pct } from "@/lib/labels";
import type { Analysis, FunnelAnalysis } from "@/lib/types";
import { RateView } from "../bits";
import { useFeedback } from "../feedback";
import { Button, Card, CardHeader, cx, DemoBadge, Empty, Input, Notice } from "../ui";
import { useExperiment } from "./context";

function FunnelChart({ f }: { f: FunnelAnalysis }) {
  const top = Math.max(...f.stages.map((s) => s.count), 1);
  return (
    <figure aria-label="Funnel chart">
      <ol className="space-y-2">
        {f.stages.map((s, i) => {
          const step = f.steps[i - 1];
          const worst = step && f.bottleneck && step.from === f.bottleneck.from;
          return (
            <li key={s.name}>
              {step && (
                <p className={cx("mb-1 pl-1 text-xs tabular-nums", worst ? "font-semibold text-d-stop" : "text-ink-3")}>
                  ↓ {pct(step.conversion.value, 1)} continue · {step.drop_off.toLocaleString()} drop off{worst && " · biggest leak"}
                </p>
              )}
              <div className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm">{s.name}</span>
                <div className="h-7 flex-1 rounded-md bg-sunken">
                  <div className="flex h-full items-center rounded-md bg-trail px-2 text-xs font-medium text-white"
                    style={{ width: `${Math.max((s.count / top) * 100, 2)}%` }}>
                  </div>
                </div>
                <span className="w-20 text-right text-sm tabular-nums">{s.count.toLocaleString()}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 text-xs text-ink-3">Overall conversion: <RateView rate={f.overall} /></figcaption>
    </figure>
  );
}

export function FunnelPanel() {
  const { exp, path, version, touch } = useExperiment();
  const { toast } = useFeedback();
  const analysis = useApi<Analysis>(`${path}/analysis`, version);
  const { reload } = analysis;
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState([{ name: "Visitors", count: "" }, { name: "Signups", count: "" }, { name: "Paid", count: "" }]);
  const [errors, setErrors] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const done = async (res: { warnings: string[] }) => {
    setErrors(null);
    setWarnings(res.warnings);
    await reload();
    touch();
    toast("success", "Funnel data saved.");
  };

  const upload = useAction(async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    try {
      await done(await api<{ warnings: string[] }>(`${path}/funnel/import`, { method: "POST", body }));
    } catch (e) {
      setErrors(errorMessage(e));
    }
    if (fileRef.current) fileRef.current.value = "";
  });

  const manual = useAction(async () => {
    try {
      const stages = rows.map((r) => ({ name: r.name.trim(), count: Number(r.count) }));
      if (stages.some((s) => !s.name || !Number.isInteger(s.count) || s.count < 0)) throw new Error("Every stage needs a name and a whole-number count ≥ 0.");
      await done(await api<{ warnings: string[] }>(`${path}/funnel`, { json: { stages } }));
    } catch (e) {
      setErrors(e instanceof Error && !("status" in e) ? e.message : errorMessage(e));
    }
  });

  const f = analysis.data?.metrics.funnel;

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <Card>
          <CardHeader title="Funnel" description="Conversions are calculated by Pursuit, not by AI." action={exp.is_demo ? <DemoBadge /> : undefined} />
          <div className="p-5">{f ? <FunnelChart f={f} /> : <Empty title="No funnel data yet" body="Upload a CSV or enter stage counts to find the biggest leak." />}</div>
        </Card>
        {f?.bottleneck && (
          <Card>
            <CardHeader title={`Why does “${f.bottleneck.from} → ${f.bottleneck.to}” leak?`} description="Competing explanations — run the test that tells them apart before changing anything." />
            <ul className="divide-y divide-line">
              {f.explanations.map((x, i) => (
                <li key={i} className="px-5 py-3">
                  <p className="text-sm font-medium">{x.explanation}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">Test: {x.test}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <Card className="xl:col-span-2">
        <CardHeader title="Add funnel data" />
        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-dashed border-line-strong p-4 text-center">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" id="funnel-csv"
              onChange={(e) => e.target.files?.[0] && upload.run(e.target.files[0])} />
            <label htmlFor="funnel-csv" className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunken">
              <Upload className="size-3.5" /> {upload.pending ? "Uploading…" : "Upload CSV"}
            </label>
            <p className="mt-2 text-xs text-ink-3">Header <code className="rounded bg-sunken px-1">stage,count</code>, one row per stage, top to bottom. Max 100 KB.</p>
          </div>
          <p className="text-center text-xs text-ink-3">or enter manually</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={`Stage ${i + 1} name`} value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Input aria-label={`Stage ${i + 1} count`} type="number" min={0} className="w-32" value={r.count} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} />
                <button aria-label="Remove stage" disabled={rows.length <= 2} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-1 text-ink-3 hover:text-d-stop disabled:opacity-30"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" disabled={rows.length >= 12} onClick={() => setRows([...rows, { name: "", count: "" }])}><Plus className="size-3.5" /> Stage</Button>
              <Button size="sm" loading={manual.pending} onClick={() => manual.run()}>Save funnel</Button>
            </div>
          </div>
          {errors && <Notice tone="bad">{errors}</Notice>}
          {warnings.map((w) => <Notice key={w} tone="flag">{w}</Notice>)}
        </div>
      </Card>
    </div>
  );
}
