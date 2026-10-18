"use client";

import { AlertTriangle, ArrowRight, FlaskConical, Loader2, Printer, RotateCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isRate, KNOWN_METRICS } from "@/components/criteria-editor";
import { SECTION_HELP, useAdvanced } from "@/components/reading-mode";
import { Personas, Problems, Segments, Snapshot, Summary } from "@/components/report/customer-sections";
import { Competitors, FunnelRisks, Messaging, PositioningPricing, Prospecting, Risks } from "@/components/report/market-sections";
import { Section, SourcesProvider } from "@/components/report/parts";
import { ReportQuestions } from "@/components/report/questions";
import { ReportPlan } from "@/components/report/plan";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, Card, Empty, Notice, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { USE_CASE_LABEL } from "@/lib/labels";
import type { Experiment, Report, ReportContent } from "@/lib/types";

const TOC = [
  ["summary", "Summary"], ["snapshot", "Company"], ["segments", "Segments"], ["personas", "Personas"],
  ["problems", "Problems"], ["competitors", "Competitors"], ["positioning", "Positioning"], ["pricing", "Pricing"],
  ["messaging", "Messaging"], ["prospecting", "Prospecting"], ["funnel", "Funnel"], ["experiments", "Experiments"],
  ["risks", "Risks"], ["sources", "Sources"],
];
const STEPS = ["Reading the company website", "Researching market, competitors and pricing", "Writing the report"];

function Progress({ r, onCancel, pending }: { r: Report; onCancel: () => void; pending: boolean }) {
  const step = r.progress.startsWith("Writing") ? 2 : r.progress.startsWith("Researching") ? 1 : 0;
  return (
    <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
      <Loader2 className="mx-auto size-8 animate-spin text-trail" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Analyzing {r.company_name || r.company_url}</h1>
      <p className="mt-1 text-sm text-ink-3">Usually 2–4 minutes. You can leave this page; the report keeps generating.</p>
      <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm" aria-live="polite">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? "text-ink-3 line-through" : i === step ? "font-medium text-ink" : "text-ink-3"}>
            {i < step ? "✓" : i === step ? "→" : "·"} {s}
          </li>
        ))}
      </ol>
      <Button className="mt-5" variant="secondary" loading={pending} onClick={onCancel}>Cancel report</Button>
      <p className="mt-2 text-xs text-ink-3">Saved research can be resumed. An AI request already in progress may still incur charges.</p>
    </Card>
  );
}

function Experiments({ c, reportId }: { c: ReportContent; reportId: string }) {
  const advanced = useAdvanced();
  const { workspace, base } = useWorkspace();
  const { toast } = useFeedback();
  const router = useRouter();
  const start = useAction(async (i: number) => {
    try {
      const exp = await api<Experiment>(`/workspaces/${workspace.id}/reports/${reportId}/experiments/${i}`, { method: "POST" });
      toast("success", "Experiment created with the report's sourced evidence.");
      router.push(`${base}/experiments/${exp.id}`);
    } catch (e) {
      toast("error", errorMessage(e));
    }
  });
  return (
    <Section id="experiments" title="Experiments to run, in order" kicker="Turn the report into evidence">
      <ol className="space-y-3">
        {c.experiments.map((e, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-start">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{e.title}</p>
                <Badge tone="trail">{USE_CASE_LABEL[e.use_case]}</Badge>
                <Badge tone="muted">{e.effort} effort</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-2">{e.hypothesis}</p>
              <p className="mt-1.5 text-xs text-ink-3">
                Success: {KNOWN_METRICS.find((m) => m.value === e.metric)?.label ?? e.metric.replace(/_/g, " ")} {e.comparator} {isRate(e.metric) ? `${Math.round(e.target * 100)}%` : e.target}
                {e.min_sample > 0 && (advanced ? ` (n ≥ ${e.min_sample})` : ` (minimum sample: ${e.min_sample})`)} · Why first: {e.why_first}
              </p>
            </div>
            <Button size="sm" variant={i === 0 ? "primary" : "secondary"} loading={start.pending} onClick={() => start.run(i)} className="print:hidden">
              <FlaskConical className="size-3.5" /> {advanced ? "Track this" : "Start this test"}
            </Button>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export default function ReportPage() {
  const advanced = useAdvanced();
  const { id } = useParams<{ id: string }>();
  const { workspace, base } = useWorkspace();
  const { toast } = useFeedback();
  const [tick, setTick] = useState(0);
  const reportPath = `/workspaces/${workspace.id}/reports/${id}`;
  const { data: r, error, reload } = useApi<Report>(reportPath, tick);
  const jobControl = useAction(async (command: "cancel" | "retry") => {
    try { await api(`${reportPath}/${command}`, { method: "POST" }); await reload(); }
    catch (e) { toast("error", errorMessage(e)); }
  });
  const running = r?.status === "QUEUED" || r?.status === "RUNNING";
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 3000);
    return () => clearInterval(t);
  }, [running]);

  if (error) return <Empty title="Report not found" body="It may belong to a workspace you can't access." />;
  if (!r) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>;
  if (running) return <Progress r={r} pending={jobControl.pending} onCancel={() => void jobControl.run("cancel")} />;
  if (r.status === "FAILED" || !r.content) {
    return (
      <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-d-stop" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">{r.status === "CANCELLED" ? "Report cancelled" : "The report couldn't be generated"}</h1>
        <p className="mt-2 text-sm text-ink-2">{r.status === "CANCELLED" ? "Your saved research is kept. Resume when you are ready." : r.error ?? "Unknown error."}</p>
        <Button className="mt-4" loading={jobControl.pending} onClick={() => jobControl.run("retry")}>Resume saved progress</Button>
        <Link href={`${base}/reports/new`} className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-trail px-3.5 py-2 text-sm font-medium text-white hover:bg-trail-strong">
          <RotateCw className="size-4" /> Try again
        </Link>
      </Card>
    );
  }
  const c = r.content;
  const v = c.validation;
  return (
    <SourcesProvider sources={r.sources}>
      <div className="mx-auto flex max-w-7xl gap-8">
        <nav aria-label="Report sections" className="sticky top-20 hidden h-fit w-44 shrink-0 xl:block print:hidden">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">On this page</p>
          <ul className="space-y-0.5 text-sm">
            {TOC.map(([k, label]) => <li key={k}><a href={`#${k}`} className="block rounded-md px-2 py-1 text-ink-2 hover:bg-sunken hover:text-ink">{!advanced && SECTION_HELP[k]?.[0] ? SECTION_HELP[k][0] : label}</a></li>)}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{advanced ? "GTM report" : "Your customer and growth report"}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{r.company_name || r.company_url}</h1>
              <p className="mt-1 text-sm text-ink-3">
                <a href={r.company_url} target="_blank" rel="noopener noreferrer" className="hover:text-trail">{r.company_url}</a>
                {" · "}{r.sources.length} sources · {r.finished_at && new Date(r.finished_at).toLocaleString()} · {r.model}
              </p>
            </div>
            <Button variant="secondary" onClick={() => window.print()} className="print:hidden"><Printer className="size-4" /> Print / PDF</Button>
          </header>
          <Notice tone="trail">
            AI research from public web sources. Green dots are <b>sourced facts</b> (click the source to verify); grey are interpretations; orange are assumptions to test.
            {v && v.downgraded_facts + v.dropped_source_refs > 0 && ` Pursuit removed ${v.dropped_source_refs} unverifiable citation(s) and downgraded ${v.downgraded_facts} unsourced "fact(s)".`}
          </Notice>
          <Summary c={c} />
          <ReportPlan path={reportPath} />
          <details className="print:hidden rounded-lg border border-line bg-surface p-4">
            <summary className="cursor-pointer font-medium text-trail">Ask about the report or explain a term</summary>
            <div className="mt-4"><ReportQuestions path={reportPath} /></div>
          </details>
          <Snapshot c={c} />
          <Segments c={c} />
          <Personas c={c} />
          <Problems c={c} />
          <Competitors c={c} />
          <PositioningPricing c={c} />
          <Messaging c={c} />
          <Prospecting c={c} />
          <FunnelRisks c={c} />
          <Experiments c={c} reportId={r.id} />
          <Risks c={c} />
          <Section id="sources" title={`Sources (${r.sources.length})`} kicker="Everything retrieved during research">
            <ol className="grid gap-1.5 text-[13px] md:grid-cols-2">
              {r.sources.map((s) => (
                <li key={s.id} className="flex min-w-0 gap-2">
                  <span className="w-8 shrink-0 text-ink-3">{s.id}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-ink-2 hover:text-trail" title={s.url}>{s.title || s.url}</a>
                </li>
              ))}
            </ol>
          </Section>
          <div className="flex justify-center pb-6 print:hidden">
            <Link href={`${base}/reports/new`} className="inline-flex items-center gap-1 text-sm font-medium text-trail">Analyze another company <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </div>
    </SourcesProvider>
  );
}
