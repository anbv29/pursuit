import type { ActionStatus, Decision, Stage, UseCase } from "./types";

export const USE_CASE_LABEL: Record<UseCase, string> = {
  segment_validation: "Segment validation",
  willingness_to_pay: "Willingness to pay",
  messaging: "Messaging experiment",
  problem_discovery: "Problem discovery",
  competitive_research: "Competitive research",
  funnel_diagnosis: "Funnel diagnosis",
};

export const STAGE_LABEL: Record<Stage, string> = {
  hypothesis: "Hypothesis",
  research: "Research",
  evidence: "Evidence",
  design: "Design",
  approval: "Approval",
  action: "Action",
  outcomes: "Outcomes",
  analysis: "Analysis",
  recommendation: "Recommendation",
};

export const DECISION_STYLE: Record<Decision, { label: string; className: string; blurb: string }> = {
  CONTINUE: { label: "Continue", className: "bg-d-continue text-white", blurb: "Evidence supports the hypothesis." },
  ITERATE: { label: "Iterate", className: "bg-d-iterate text-white", blurb: "Promising, but something needs adjusting." },
  PIVOT: { label: "Pivot", className: "bg-d-pivot text-white", blurb: "The data points somewhere else." },
  STOP: { label: "Stop", className: "bg-d-stop text-white", blurb: "Evidence is against this hypothesis." },
  INCONCLUSIVE: { label: "Inconclusive", className: "bg-d-inconclusive text-white", blurb: "Not enough data to judge." },
};

export const ACTION_STATUS: Record<ActionStatus, { label: string; tone: Tone; help: string }> = {
  PENDING_APPROVAL: { label: "Needs approval", tone: "flag", help: "Nothing happens until someone approves." },
  QUEUED: { label: "Queued", tone: "neutral", help: "Approved and waiting to run. Not executed yet." },
  RUNNING: { label: "Running", tone: "neutral", help: "Submitted to Fo; waiting for a result." },
  SUCCEEDED: { label: "Succeeded", tone: "good", help: "Completed (simulated in demo mode)." },
  FAILED: { label: "Failed", tone: "bad", help: "Did not happen. See the error." },
  CANCELLED: { label: "Cancelled", tone: "muted", help: "Cancelled before running." },
  REJECTED: { label: "Rejected", tone: "muted", help: "A reviewer declined this action." },
  UNKNOWN: { label: "Confirm outcome", tone: "flag", help: "Fo responded, but no one has confirmed what actually happened." },
};

export type Tone = "neutral" | "good" | "bad" | "flag" | "muted" | "trail" | "demo";

export const pct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;

export const humanMetric = (m: string) => m.replace(/_/g, " ").replace(/\brate\b/, "rate");

export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
