"use client";

import { Field, Textarea } from "@/components/ui";

export const realityQuestions = [
  ["customers", "Who has actually used or paid for this?", "A role, approximate count and recent example. No customers yet is a useful answer."],
  ["buying_decision", "Who decides whether to buy?", "Who uses it, approves it and controls the budget? Say unknown if you have not tested this."],
  ["pricing", "What have people actually paid or committed to?", "Separate payments, signed pilots and deposits from compliments or interest."],
  ["objections", "What makes people hesitate or say no?", "A recent objection, alternative they chose, or reason they stayed with their current approach."],
  ["recent_result", "What did you try recently, and what happened?", "For example: contacted 20 clinics, got 3 replies and no paid pilots. Include a timeframe."],
] as const;

export type FounderReality = Partial<Record<typeof realityQuestions[number][0], string>>;

export function FounderRealityCheck({ value, onChange, disabled = false }: {
  value: FounderReality; onChange: (value: FounderReality) => void; disabled?: boolean;
}) {
  return <details className="rounded-xl border border-line p-4">
    <summary className="cursor-pointer font-medium">Founder reality check <span className="text-sm font-normal text-ink-3">(optional, 2 minutes)</span></summary>
    <p className="mt-3 text-sm leading-relaxed text-ink-2">Help the research challenge your assumptions using what has actually happened. Answer any question, or skip all five. Your answers are shared with the research provider and saved with this report as founder-reported context. Avoid names, contact details and confidential customer information.</p>
    <div className="mt-5 space-y-5">{realityQuestions.map(([key, label, hint]) =>
      <Field key={key} label={label} hint={hint}>{id => <Textarea id={id} rows={3} maxLength={600}
        disabled={disabled} value={value[key] ?? ""}
        onChange={event => onChange({ ...value, [key]: event.target.value })} />}</Field>
    )}</div>
  </details>;
}

export function FounderRealitySummary({ value }: { value: FounderReality }) {
  const answered = realityQuestions.filter(([key]) => value[key]?.trim());
  if (!answered.length) return null;
  return <details className="rounded-xl border border-line p-4 text-sm">
    <summary className="cursor-pointer font-medium">Your founder context ({answered.length}/5 answered)</summary>
    <p className="mt-3 text-ink-3">Self-reported context used in this preview. These answers are not independently verified evidence.</p>
    <dl className="mt-4 space-y-4">{answered.map(([key, label]) => <div key={key}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">{value[key]}</dd></div>)}</dl>
  </details>;
}
