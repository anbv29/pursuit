"use client";

import { ChevronDown, Globe, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useWorkspace } from "@/components/shell";
import { ResearchAllowance } from "@/components/allowance";
import { Button, cx, Field, Glass, Input, Notice, Select, Textarea } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { Report } from "@/lib/types";

const urlSchema = z
  .string()
  .trim()
  .min(3, "Enter your website.")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.url({ protocol: /^https?$/, message: "Enter a valid website, like acme.com." }));

const EMPTY = {
  company_url: "", company_name: "", description: "", target_customers: "", stage: "",
  business_model: "", pricing: "", known_competitors: "", geography: "", goal: "",
};

export default function NewReportPage() {
  const { workspace, base } = useWorkspace();
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = useAction(async () => {
    const url = urlSchema.safeParse(f.company_url);
    if (!url.success) return setErrors({ company_url: url.error.issues[0].message });
    setErrors({});
    setFormError(null);
    try {
      const report = await api<Report>(`/workspaces/${workspace.id}/reports`, { json: { ...f, company_url: url.data } });
      router.push(`${base}/reports/${report.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setFormError(errorMessage(e)); // inputs are kept so nothing has to be retyped
    }
  });

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-surface/70 px-3 py-1 text-xs font-medium text-ink-2">
          <Sparkles className="size-3.5 text-trail" aria-hidden /> Full report in about 3 minutes
        </span>
        <h1 className="mt-4 font-display text-[32px] font-bold leading-tight tracking-tight sm:text-4xl">Analyze your company</h1>
        <p className="mx-auto mt-2 max-w-lg text-ink-2">
          Drop your website. Pursuit reads it, researches your market and competitors on the web, and
          builds a sourced report: who to sell to, how to position, what to charge, what to say, and which
          experiments to run first.
        </p>
      </div>

      <form noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); void submit.run(); }} className="mt-8 space-y-5">
        <Glass className="p-5 sm:p-7">
          <div className="space-y-5">
            <Field label="Website" error={errors.company_url}>
              {(id, d) => (
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                  <Input id={id} aria-describedby={d} aria-invalid={!!errors.company_url} inputMode="url" autoFocus
                    className="h-11 pl-9 text-base" placeholder="acme.com" value={f.company_url} onChange={set("company_url")} />
                </div>
              )}
            </Field>
            <Field label="What do you do, and for whom?" hint="A few sentences in your own words. This sharpens the research a lot.">
              {(id) => <Textarea id={id} rows={3} value={f.description} onChange={set("description")}
                placeholder="We help independent clinics get paid faster by automating insurance claim reconciliation." />}
            </Field>
            <Field label="What do you most want to learn?">
              {(id) => <Input id={id} value={f.goal} onChange={set("goal")} placeholder="e.g. Which segment to target first, and how to price" />}
            </Field>
          </div>

          <button type="button" onClick={() => setMore(!more)} aria-expanded={more}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-trail hover:text-trail-strong">
            <ChevronDown className={cx("size-4 transition-transform", more && "rotate-180")} /> More context (optional)
          </button>
          {more && (
            <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <Field label="Company name">{(id) => <Input id={id} value={f.company_name} onChange={set("company_name")} />}</Field>
              <Field label="Stage">{(id) => (
                <Select id={id} value={f.stage} onChange={set("stage")}>
                  <option value="">Not sure</option><option value="idea">Idea</option><option value="pre_revenue">Building, pre-revenue</option>
                  <option value="early_revenue">Early revenue</option><option value="growth">Growing</option>
                </Select>)}</Field>
              <div className="sm:col-span-2"><Field label="Who you sell to today">{(id) => <Input id={id} value={f.target_customers} onChange={set("target_customers")} placeholder="Roles, company size, industry" />}</Field></div>
              <Field label="Business model">{(id) => <Input id={id} value={f.business_model} onChange={set("business_model")} placeholder="B2B SaaS, marketplace…" />}</Field>
              <Field label="Current pricing">{(id) => <Input id={id} value={f.pricing} onChange={set("pricing")} placeholder="$49/seat/month" />}</Field>
              <Field label="Competitors you know of">{(id) => <Input id={id} value={f.known_competitors} onChange={set("known_competitors")} />}</Field>
              <Field label="Region">{(id) => <Input id={id} value={f.geography} onChange={set("geography")} placeholder="US, EU…" />}</Field>
            </div>
          )}
        </Glass>
        {formError && <Notice tone="bad">{formError}</Notice>}
        <ResearchAllowance />
        <Button type="submit" size="lg" loading={submit.pending} className="w-full">Generate report</Button>
        <p className="text-center text-xs text-ink-3">
          Research uses public web sources only. Every claim in the report is labelled as a sourced fact, an interpretation or an assumption.
        </p>
      </form>
    </div>
  );
}
