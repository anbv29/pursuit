"use client";

import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { STAGE_LABEL } from "@/lib/labels";
import { useFeedback } from "../feedback";
import { Button, cx } from "../ui";
import { useExperiment } from "./context";
import { useAdvanced } from "../reading-mode";
import { useWorkspace } from "../shell";
import Link from "next/link";

const NEXT_HELP: Record<string, string> = {
  hypothesis: "Write down a belief you can test: who has the problem, and what you expect to happen.",
  research: "Learn about your customers and alternatives before spending time on a test.",
  evidence: "Save what you found, where it came from, and anything that challenges your idea.",
  design: "Decide what to test and what result would count as success.",
  approval: "Review any email, meeting, or research request before allowing it to run.",
  action: "Follow the approved work and check whether it actually happened.",
  outcomes: "Record real replies, interviews, commitments, or other results.",
  analysis: "Compare your results with the goals you set before the test.",
  recommendation: "Decide whether to keep going, improve the test, change direction, or gather more data.",
};

/** The shared lifecycle, with what's blocking the next step spelled out. */
export function StageRail() {
  const { exp, path, reload, touch } = useExperiment();
  const { toast } = useFeedback();
  const advanced = useAdvanced();
  const { base } = useWorkspace();
  const idx = exp.stages.findIndex((s) => s.state === "current");
  const next = exp.stages[idx + 1];
  const prev = exp.stages[idx - 1];

  const move = useAction(async (to: string) => {
    try {
      await api(`${path}/transition`, { json: { to } });
      await reload();
      touch();
    } catch (e) {
      toast("error", errorMessage(e));
    }
  });

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      {!advanced && <p className="mb-3 max-w-prose text-sm text-ink-2">{NEXT_HELP[exp.stage]}</p>}
      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Experiment lifecycle">
        {exp.stages.map((s, i) => (
          <li key={s.stage} aria-current={s.state === "current" ? "step" : undefined}
            className={cx("flex min-w-[6.5rem] flex-1 flex-col gap-1.5 rounded-lg px-2 py-2",
              s.state === "current" && "bg-trail-soft")}>
            <div className="flex items-center gap-1.5">
              <span className={cx("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                s.state === "done" ? "bg-trail text-white" : s.state === "current" ? "bg-surface text-trail ring-2 ring-trail" : "bg-sunken text-ink-3")}>
                {s.state === "done" ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cx("truncate text-xs", s.state === "upcoming" ? "text-ink-3" : "font-medium text-ink")}>{STAGE_LABEL[s.stage]}</span>
            </div>
            <span className={cx("h-1 rounded-full", s.state === "done" ? "bg-trail" : s.state === "current" ? "bg-trail/40" : "bg-line")} />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
          {next ? (
            next.ready ? <>Ready to move to <b>{STAGE_LABEL[next.stage]}</b>.</>
              : <><Lock className="size-3.5 text-flag" aria-hidden /> <span>{next.blocker}</span></>
          ) : exp.archived_at ? "Archived." : "Lifecycle complete. Go back a stage to iterate."}
        </p>
        <div className="flex gap-2">
          {prev && (
            <Button variant="ghost" size="sm" disabled={move.pending || !!exp.archived_at} onClick={() => move.run(prev.stage)}>
              <ChevronLeft className="size-3.5" /> Back to {STAGE_LABEL[prev.stage]}
            </Button>
          )}
          {next && (
            <Button size="sm" loading={move.pending} disabled={!next.ready || !!exp.archived_at} onClick={() => move.run(next.stage)}>
              Advance to {STAGE_LABEL[next.stage]} <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {next?.stage === "action" && !next.ready && <Link href={`${base}/experiments/${exp.id}?tab=actions`} className="mt-3 inline-block text-sm font-medium text-trail underline underline-offset-4">
        Open Actions → request an action → review and approve it
      </Link>}
    </div>
  );
}
