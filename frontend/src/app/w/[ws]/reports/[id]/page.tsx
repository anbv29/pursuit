"use client";

import { FounderRealitySummary } from "@/components/founder-reality";
import { plainCopy } from "@/lib/plain-copy";

import { AlertTriangle, FlaskConical, Printer, RotateCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isRate, KNOWN_METRICS } from "@/components/criteria-editor";
import { SECTION_HELP, useAdvanced } from "@/components/reading-mode";
import { Personas, Problems, Segments, Snapshot, Summary } from "@/components/report/customer-sections";
import { Competitors, FunnelRisks, Messaging, PositioningPricing, Prospecting, Risks } from "@/components/report/market-sections";
import { Section, SourcesProvider } from "@/components/report/parts";
import { ReportQuestions } from "@/components/report/questions";
import { ReportPlan } from "@/components/report/plan";
import { ReportVersions } from "@/components/report/versions";
import { ReportProspects } from "@/components/report/prospects";
import { ReportSharing } from "@/components/report/sharing";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { ProcessingFeed, type FeedStep, Elapsed } from "@/components/processing-feed";
import { Badge, Button, buttonStyles, cx, Empty, Glass, Notice, PageHeader, Skeleton } from "@/components/ui";
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
const STEPS: FeedStep[] = [
  { label: "Reading the company website", done: "Read the company website" },
  { label: "Researching market, competitors and pricing", done: "Researched market, competitors and pricing" },
  { label: "Writing the report", done: "Wrote the report" },
];

function Progress({ r, onCancel, pending }: { r: Report; onCancel: () => void; pending: boolean }) {
  // Step and source count come only from the server's progress line; nothing is simulated.
  const step = r.progress.startsWith("Writing") ? 2 : r.progress.startsWith("Researching") ? 1 : 0;
  const sources = Number(r.progress.match(/(\d+)\s+sources/)?.[1] ?? 0);
  return (
    <Glass className="enter-rise mx-auto mt-4 max-w-xl p-6 sm:p-8">
      <p className="text-[13px] font-medium text-trail">{r.status === "QUEUED" ? "Queued" : "Working"} · <Elapsed since={r.started_at ?? r.created_at} /></p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Analyzing {r.company_name || r.company_url}</h1>
      <p className="mt-1.5 text-sm text-ink-2">Usually 2-4 minutes. You can leave this page; the report keeps generating.</p>
      <div className="mt-6" aria-live="polite">
        <ProcessingFeed steps={STEPS} current={step} detail={r.progress} count={sources} countLabel="sources gathered" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--glass-border)] pt-5">
        <Button variant="secondary" loading={pending} onClick={onCancel}>Cancel report</Button>
        <p className="text-xs text-ink-3">Saved research can be resumed. An AI request already in progress may still incur charges.</p>
      </div>
    </Glass>
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
          <li key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:flex-row sm:items-start">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-sm font-bold text-trail-strong">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{e.title}</p>
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
  // Success toast when a report you were watching finishes.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running) wasRunning.current = true;
    else if (wasRunning.current && r?.status === "SUCCEEDED") {
      wasRunning.current = false;
      toast("success", "Report ready.");
    }
  }, [running, r?.status, toast]);

  if (error) {
    return (
      <Glass className="mx-auto mt-6 max-w-lg p-2">
        <Empty icon={<AlertTriangle className="size-5" />} title="Report not found" body="It may belong to a workspace you can't access."
          action={<Link href={`${base}/reports`} className={buttonStyles("secondary")}>Back to reports</Link>} />
      </Glass>
    );
  }
  if (!r) {
    return (
      <div className="mx-auto max-w-5xl space-y-4" aria-busy aria-label="Loading report">
        <Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-80 max-w-full" /><Skeleton className="h-14" />
        <Skeleton className="h-64" /><Skeleton className="h-48" />
      </div>
    );
  }
  if (running) return <Progress r={r} pending={jobControl.pending} onCancel={() => void jobControl.run("cancel")} />;
  if (r.status === "FAILED" || !r.content) {
    const cancelled = r.status === "CANCELLED";
    return (
      <Glass className="mx-auto mt-6 max-w-xl p-8 text-center">
        <span className={cx("mx-auto grid size-12 place-items-center rounded-2xl", cancelled ? "bg-[var(--inset)] text-ink-2" : "bg-danger-soft text-danger")}>
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">{cancelled ? "Report cancelled" : "The report couldn't be generated"}</h1>
        <p className="mt-2 text-sm text-ink-2">{cancelled ? "Your saved research is kept. Resume when you are ready." : r.error ?? "Unknown error."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button loading={jobControl.pending} onClick={() => jobControl.run("retry")}>Resume saved progress</Button>
          <Link href={`${base}/reports/new`} className={buttonStyles("secondary")}><RotateCw className="size-4" aria-hidden /> Start a new report</Link>
        </div>
      </Glass>
    );
  }
  const c = plainCopy(r.content);
  const v = c.validation;
  return (
    <SourcesProvider sources={r.sources}>
      <div className="mx-auto flex max-w-6xl items-start gap-6">
        <nav aria-label="Report sections" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] w-44 shrink-0 overflow-y-auto xl:block print:hidden">
          <Glass dense className="p-3">
            <p className="mb-2 px-2 text-xs font-semibold text-ink-3">On this page</p>
            <ul className="space-y-0.5 text-sm">
              {TOC.map(([k, label]) => <li key={k}><a href={`#${k}`} className="block rounded-lg px-2 py-1.5 text-ink-2 transition-colors hover:bg-[var(--inset)] hover:text-ink">{!advanced && SECTION_HELP[k]?.[0] ? SECTION_HELP[k][0] : label}</a></li>)}
            </ul>
          </Glass>
        </nav>
        <div className="min-w-0 flex-1 space-y-6">
          <PageHeader eyebrow={advanced ? "GTM report" : "Your customer and growth report"} title={r.company_name || r.company_url}
            description={<>
              <a href={r.company_url} target="_blank" rel="noopener noreferrer" className="break-all hover:text-trail">{r.company_url}</a>
              {" · "}{r.sources.length} sources · {r.finished_at && new Date(r.finished_at).toLocaleString()}
            </>}
            action={<Button variant="secondary" onClick={() => window.print()} className="print:hidden"><Printer className="size-4" aria-hidden /> Print or save PDF</Button>} />
          <Notice tone="trail">
            AI research from public web sources. Claims are labelled as <b>sourced facts</b>, interpretations or assumptions. Click a source to verify it.
            {v && v.downgraded_facts + v.dropped_source_refs > 0 && ` Pursuit removed ${v.dropped_source_refs} unverifiable citation(s) and downgraded ${v.downgraded_facts} unsourced "fact(s)".`}
          </Notice>
          <FounderRealitySummary value={r.inputs.founder_reality ?? {}} />
          <Summary c={c} />
          {workspace.role === "owner" && <ReportSharing path={reportPath} />}
          <ReportPlan path={reportPath} />
          <details className="surface group print:hidden rounded-[var(--radius-lg)] p-4 sm:p-5">
            <summary className="cursor-pointer list-none font-semibold text-trail marker:hidden">Ask about the report or explain a term</summary>
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
          <ReportProspects path={reportPath} />
          <FunnelRisks c={c} />
          <Experiments c={c} reportId={r.id} />
          <Risks c={c} />
          <details className="surface group print:hidden rounded-[var(--radius-lg)] p-4 sm:p-5">
            <summary className="cursor-pointer list-none font-semibold text-trail marker:hidden">Correct facts, refresh sections, or compare versions</summary>
            <div className="mt-4"><ReportVersions path={reportPath} refresh={reload} /></div>
          </details>
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
            <Link href={`${base}/reports/new`} className={buttonStyles("secondary")}>Analyze another company</Link>
          </div>
        </div>
      </div>
    </SourcesProvider>
  );
}
