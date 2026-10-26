"use client";

import { z } from "zod";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { GTMConstraints } from "@/lib/types";

export const defaultConstraints: GTMConstraints = { monthly_budget: null, currency: "USD", weekly_hours: null, team_size: null, horizon_days: 90, available_assets: "", channel_constraints: "" };
export const constraintsSchema = z.object({
  monthly_budget: z.number().min(0).max(1_000_000_000).nullable(), currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  weekly_hours: z.number().min(0).max(168).nullable(), team_size: z.number().int().min(1).max(10000).nullable(),
  horizon_days: z.union([z.literal(30), z.literal(60), z.literal(90)]), available_assets: z.string().max(1500), channel_constraints: z.string().max(1000),
});
export const researchUrlsSchema = z.array(z.url({ protocol: /^https?$/, message: "Each research URL must start with http:// or https://." })).max(6, "Add no more than six research URLs.");
export const splitResearchUrls = (text: string) => text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

export function GTMConstraintsForm({ value, onChange, urls, onUrlsChange, disabled = false }: {
  value: GTMConstraints; onChange: (value: GTMConstraints) => void; urls: string; onUrlsChange: (value: string) => void; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="[&_input]:min-h-11 [&_select]:min-h-11 min-w-0 space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-6">
    <legend className="px-2 font-semibold">Your GTM resources</legend>
    <p className="text-sm text-ink-2">Make the plan fit your reality. Leave numbers blank if unknown. Enter 0 for no budget or no available hours.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Monthly budget">{id => <Input id={id} type="number" min={0} max={1_000_000_000} step="any" value={value.monthly_budget ?? ""} placeholder="Unknown" onChange={e => onChange({ ...value, monthly_budget: e.target.value === "" ? null : Number(e.target.value) })} />}</Field>
      <Field label="Currency">{id => <Input id={id} maxLength={3} value={value.currency} onChange={e => onChange({ ...value, currency: e.target.value.toUpperCase() })} />}</Field>
      <Field label="Weekly hours">{id => <Input id={id} type="number" min={0} max={168} step="any" value={value.weekly_hours ?? ""} placeholder="Unknown" onChange={e => onChange({ ...value, weekly_hours: e.target.value === "" ? null : Number(e.target.value) })} />}</Field>
      <Field label="Team size">{id => <Input id={id} type="number" min={1} max={10000} value={value.team_size ?? ""} placeholder="Unknown" onChange={e => onChange({ ...value, team_size: e.target.value === "" ? null : Number(e.target.value) })} />}</Field>
      <Field label="Planning horizon">{id => <Select id={id} value={value.horizon_days} onChange={e => onChange({ ...value, horizon_days: e.target.value === "30" ? 30 : e.target.value === "60" ? 60 : 90 })}><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></Select>}</Field>
    </div>
    <Field label="Available assets">{id => <Textarea id={id} maxLength={1500} value={value.available_assets} onChange={e => onChange({ ...value, available_assets: e.target.value })} placeholder="Existing audience, customer relationships, content, partnerships…" />}</Field>
    <Field label="Channel constraints">{id => <Textarea id={id} maxLength={1000} value={value.channel_constraints} onChange={e => onChange({ ...value, channel_constraints: e.target.value })} placeholder="Channels to avoid, preferred channels, access restrictions…" />}</Field>
    <Field label="Research URLs" hint="Up to six http(s) URLs, one per line. No general web search is available.">{(id, description) => <Textarea id={id} aria-describedby={description} rows={3} value={urls} onChange={e => onUrlsChange(e.target.value)} placeholder="https://example.com/research" />}</Field>
  </fieldset>;
}
