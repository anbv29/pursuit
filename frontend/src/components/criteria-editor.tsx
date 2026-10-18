"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "./ui";

export type CriterionDraft = { metric: string; comparator: string; target: number; min_sample: number; description: string };

export const KNOWN_METRICS: { value: string; label: string; rate: boolean }[] = [
  { value: "interviews_completed", label: "Interviews completed", rate: false },
  { value: "problem_confirmed_rate", label: "Problem confirmed rate", rate: true },
  { value: "strong_pain_rate", label: "Strong pain rate", rate: true },
  { value: "budget_owner_identified_rate", label: "Budget owner identified rate", rate: true },
  { value: "commitments", label: "Commitments (LOI / deposit / paid pilot)", rate: false },
  { value: "verbal_interest", label: "Verbal interest", rate: false },
  { value: "positive_reply_rate", label: "Positive reply rate", rate: true },
  { value: "meetings_booked", label: "Meetings booked", rate: false },
  { value: "competitors_profiled", label: "Competitors profiled", rate: false },
  { value: "worst_stage_conversion", label: "Worst funnel step conversion", rate: true },
];

export const isRate = (m: string) => KNOWN_METRICS.find((k) => k.value === m)?.rate ?? false;

export function CriteriaEditor({ value, onChange }: { value: CriterionDraft[]; onChange: (v: CriterionDraft[]) => void }) {
  const update = (i: number, patch: Partial<CriterionDraft>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => {
        const rate = isRate(c.metric);
        return (
          <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-line bg-paper p-2">
            <Select aria-label="Metric" className="col-span-12 sm:col-span-5" value={c.metric} onChange={(e) => update(i, { metric: e.target.value })}>
              {KNOWN_METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <Select aria-label="Comparator" className="col-span-3 sm:col-span-2" value={c.comparator} onChange={(e) => update(i, { comparator: e.target.value })}>
              {[">=", ">", "<=", "<"].map((o) => <option key={o}>{o}</option>)}
            </Select>
            <div className="col-span-4 sm:col-span-2 flex items-center gap-1">
              <Input aria-label="Target" type="number" min={0} step={rate ? 1 : 1}
                value={rate ? Math.round(c.target * 100) : c.target}
                onChange={(e) => update(i, { target: rate ? Number(e.target.value) / 100 : Number(e.target.value) })} />
              {rate && <span className="text-xs text-ink-3">%</span>}
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input aria-label="Minimum sample" type="number" min={0} title="Minimum sample before this criterion is judged"
                value={c.min_sample} onChange={(e) => update(i, { min_sample: Number(e.target.value) })} />
            </div>
            <button type="button" aria-label="Remove criterion" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="col-span-1 grid place-items-center rounded-md p-1.5 text-ink-3 hover:bg-flag-soft hover:text-d-stop">
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3">Columns: metric · comparator · target · minimum sample size before judging.</p>
        <Button type="button" variant="ghost" size="sm" disabled={value.length >= 10}
          onClick={() => onChange([...value, { metric: "interviews_completed", comparator: ">=", target: 5, min_sample: 0, description: "" }])}>
          <Plus className="size-3.5" /> Add criterion
        </Button>
      </div>
    </div>
  );
}
