"use client";

import { Archive } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, type ReactNode } from "react";
import { ActionsPanel } from "@/components/experiment/actions";
import { CompetitivePanel } from "@/components/experiment/competitive";
import { ExperimentContext } from "@/components/experiment/context";
import { DiscoveryPanel } from "@/components/experiment/discovery";
import { EvidencePanel } from "@/components/experiment/evidence";
import { FunnelPanel } from "@/components/experiment/funnel";
import { MessagingPanel } from "@/components/experiment/messaging";
import { OutcomesPanel } from "@/components/experiment/outcomes";
import { Overview } from "@/components/experiment/overview";
import { StageRail } from "@/components/experiment/stage-rail";
import { useFeedback } from "@/components/feedback";
import { useWorkspace } from "@/components/shell";
import { Badge, Button, cx, DemoBadge, Empty, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { USE_CASE_LABEL } from "@/lib/labels";
import type { ExperimentDetail, UseCase } from "@/lib/types";

type Tab = { id: string; label: string; render: () => ReactNode };

function tabsFor(uc: UseCase): Tab[] {
  const overview = { id: "overview", label: "Overview", render: () => <Overview /> };
  const evidence = { id: "evidence", label: "Research & evidence", render: () => <EvidencePanel /> };
  const discovery = { id: "discovery", label: "Prospects & interviews", render: () => <DiscoveryPanel /> };
  const actions = { id: "actions", label: "Actions", render: () => <ActionsPanel /> };
  const outcomes = { id: "outcomes", label: "Outcomes", render: () => <OutcomesPanel /> };
  switch (uc) {
    case "messaging":
      return [overview, { id: "messaging", label: "Variants", render: () => <MessagingPanel /> }, discovery, actions, outcomes, evidence];
    case "competitive_research":
      return [overview, { id: "competitive", label: "Competitors", render: () => <CompetitivePanel /> }, actions];
    case "funnel_diagnosis":
      return [overview, { id: "funnel", label: "Funnel", render: () => <FunnelPanel /> }, evidence, actions];
    default:
      return [overview, evidence, discovery, actions, outcomes];
  }
}

function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace, base } = useWorkspace();
  const router = useRouter();
  const search = useSearchParams();
  const { confirm, toast } = useFeedback();
  const path = `/workspaces/${workspace.id}/experiments/${id}`;
  const { data: exp, error, reload } = useApi<ExperimentDetail>(path);
  const [version, setVersion] = useState(0);
  const touch = useCallback(() => setVersion((v) => v + 1), []);

  if (error) return <Empty title="Experiment not found" body="It may have been deleted, or it belongs to a workspace you can't access." />;
  if (!exp) return <div className="space-y-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;

  const tabs = tabsFor(exp.use_case);
  const active = tabs.find((t) => t.id === search.get("tab")) ?? tabs[0];
  const setTab = (t: string) => router.replace(`${base}/experiments/${id}?tab=${t}`, { scroll: false });

  const archive = async () => {
    const ok = await confirm({ title: "Archive this experiment?", body: "It will be hidden from the dashboard. Pending approvals will be cancelled. Data is kept.", confirm: "Archive", danger: true });
    if (!ok) return;
    try {
      await api(`${path}/archive`, { method: "POST" });
      toast("success", "Experiment archived.");
      router.push(base);
    } catch (e) {
      toast("error", errorMessage(e));
    }
  };

  return (
    <ExperimentContext.Provider value={{ exp, path, reload, version, touch }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="trail">{USE_CASE_LABEL[exp.use_case]}</Badge>
              {exp.is_demo && <DemoBadge />}
              {exp.archived_at && <Badge tone="muted">Archived</Badge>}
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">{exp.title}</h1>
          </div>
          {!exp.archived_at && <Button variant="ghost" size="sm" onClick={archive}><Archive className="size-3.5" /> Archive</Button>}
        </div>
        <StageRail />
        <div role="tablist" aria-label="Experiment sections" className="flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === active.id} onClick={() => setTab(t.id)}
              className={cx("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                t.id === active.id ? "border-trail font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink")}>
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel">{active.render()}</div>
      </div>
    </ExperimentContext.Provider>
  );
}

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-64" />}><ExperimentPage /></Suspense>;
}
