// Mirrors backend response schemas (backend/app/schemas).

export type UseCase =
  | "segment_validation"
  | "willingness_to_pay"
  | "messaging"
  | "problem_discovery"
  | "competitive_research"
  | "funnel_diagnosis";

export type Stage =
  | "hypothesis"
  | "research"
  | "evidence"
  | "design"
  | "approval"
  | "action"
  | "outcomes"
  | "analysis"
  | "recommendation";

export type Decision = "CONTINUE" | "ITERATE" | "PIVOT" | "STOP" | "INCONCLUSIVE";
export type Origin = "manual" | "import" | "fo" | "ai" | "demo";
export type ActionStatus =
  | "PENDING_APPROVAL"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED"
  | "UNKNOWN";

export interface User { id: string; email: string; name: string }
export interface Session { user: User; csrf_token: string }
export interface Workspace { id: string; name: string; is_demo: boolean; created_at: string; role: string }

export interface Criterion {
  id: string; metric: string; comparator: string; target: number; min_sample: number; description: string;
}
export interface StageStatus { stage: Stage; state: "done" | "current" | "upcoming"; ready: boolean; blocker: string | null }
export interface Experiment {
  id: string; workspace_id: string; use_case: UseCase; title: string; hypothesis: string;
  target_audience: string; stage: Stage; config: Record<string, unknown>; is_demo: boolean;
  archived_at: string | null; created_at: string; updated_at: string; criteria: Criterion[];
}
export interface ExperimentDetail extends Experiment { stages: StageStatus[]; counts: Record<string, number> }

export interface Template {
  use_case: UseCase; name: string; summary: string; hypothesis_hint: string;
  default_criteria: Omit<Criterion, "id">[]; actions: string[];
}

export interface Source {
  id: string; url: string; title: string; excerpt: string; content_sha256: string | null;
  retrieved_at: string; origin: Origin;
}
export interface Evidence {
  id: string; kind: "observed_fact" | "interpretation" | "assumption";
  stance: "supports" | "contradicts" | "neutral"; claim: string; relevance: number; tags: string[];
  origin: Origin; created_at: string; source: Source | null;
}
export interface Prospect {
  id: string; name: string; company: string; role: string; email: string | null; segment: string;
  source_url: string | null; context: string; status: string; origin: Origin; created_at: string;
}
export interface Interview {
  id: string; prospect_id: string | null; scheduled_at: string | null; status: string; notes: string;
  pain_points: string[]; current_solution: string; frequency: string; cost_of_problem: string;
  budget_owner: string; wtp_signal: "none" | "verbal" | "commitment"; contradictions: string;
  origin: Origin; created_at: string;
}
export interface Variant { id: string; label: string; subject: string; body: string; angle: string; created_at: string }
export interface Outcome {
  id: string; kind: string; variant_id: string | null; prospect_id: string | null; action_id: string | null;
  value: number | null; note: string; origin: Origin; occurred_at: string;
}
export interface Action {
  id: string; experiment_id: string; kind: "send_email" | "schedule_meeting" | "research_task";
  mode: "demo" | "live"; target: string; payload: Record<string, unknown>; status: ActionStatus;
  prospect_id: string | null; variant_id: string | null; decided_at: string | null;
  started_at: string | null; finished_at: string | null; attempts: number;
  result_summary: string | null; error: string | null; created_at: string;
}
export interface Rate {
  numerator: number; denominator: number; value: number | null; ci_low: number | null; ci_high: number | null;
}
export interface CriterionResult {
  criterion_id: string; metric: string; comparator: string; target: number; min_sample: number;
  value: number | null; sample: number; status: "met" | "not_met" | "insufficient_sample" | "no_data";
}
export interface FunnelStep { from: string; to: string; conversion: Rate; drop_off: number }
export interface FunnelAnalysis {
  stages: { name: string; count: number }[]; steps: FunnelStep[]; overall: Rate;
  bottleneck: FunnelStep | null; explanations: { explanation: string; test: string }[];
}
export interface Metrics {
  includes_demo_data: boolean; outcome_counts: Record<string, number>;
  excluded_simulated_outcomes: Record<string, number>; interviews_completed: number;
  problem_confirmed: Rate; strong_pain: Rate; budget_owner_identified: Rate;
  verbal_interest: number; commitments: number; pain_point_frequency: [string, number][];
  variants: { variant_id: string; label: string; sent: number; delivered: number; reply: Rate;
    positive_reply: Rate; meetings: number }[];
  positive_reply: Rate; meetings_booked: number; evidence: Record<string, number>;
  competitors_profiled: number; funnel: FunnelAnalysis | null;
}
export interface Analysis { metrics: Metrics; criteria: CriterionResult[] }
export interface Recommendation {
  id: string; decision: Decision; confidence: number; rationale: string; assumptions: string[];
  counterevidence: { evidence_id: string; claim: string }[]; limitations: string[]; next_action: string;
  evidence_ids: string[]; generated_by: string; includes_demo_data: boolean; created_at: string;
}
export interface TimelineItem { id: string; action: string; actor_name: string | null; detail: Record<string, unknown>; created_at: string }

// ---- company reports ----------------------------------------------------------
export type ClaimKind = "fact" | "interpretation" | "assumption";
export interface Claim { text: string; kind: ClaimKind; confidence: "high" | "medium" | "low"; source_ids: string[]; unsourced?: boolean }
export interface ReportSource { id: string; url: string; title: string; via: string }
export interface ReportContent {
  executive_summary: string[];
  snapshot: { name: string; one_liner: string; offering: string; business_model: string; stage_assessment: string; observed_pricing: Claim[]; key_facts: Claim[] };
  segments: { name: string; description: string; pains: string[]; buying_trigger: string; decision_maker: string; fit_score: number; rationale: Claim }[];
  personas: { title: string; goals: string[]; pains: string[]; objections: string[]; where_to_find: string[] }[];
  problems: { statement: string; supporting: Claim[]; against: Claim[]; how_to_validate: string }[];
  competitors: { name: string; url: string; positioning: string; target_customers: string; pricing: string; strengths: string[]; weaknesses: string[]; source_ids: string[]; unsourced?: boolean }[];
  positioning: { gaps: Claim[]; recommended_statement: string; differentiators: string[] };
  pricing: { market_benchmarks: Claim[]; hypotheses: string[]; wtp_questions: string[] };
  messaging: { name: string; segment: string; hook: string; subject: string; body: string }[];
  prospecting: { signals: string[]; channels: string[]; search_queries: string[] };
  funnel_risks: { stage: string; risk: string; leading_metric: string; test: string }[];
  experiments: { use_case: UseCase; title: string; hypothesis: string; metric: string; comparator: string; target: number; min_sample: number; why_first: string; effort: "low" | "medium" | "high" }[];
  risks_and_unknowns: string[];
  focus_first: string;
  validation?: { dropped_source_refs: number; downgraded_facts: number; fixed_metrics: number };
}
export interface Report {
  id: string; company_url: string; company_name: string; inputs: Record<string, string>;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; progress: string; content: ReportContent | null;
  sources: ReportSource[]; model: string | null; error: string | null;
  created_at: string; started_at: string | null; finished_at: string | null;
}
export type ReportListItem = Pick<Report, "id" | "company_url" | "company_name" | "status" | "progress" | "created_at">;
