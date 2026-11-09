"use client";

import { GTMConstraintsForm, defaultConstraints, constraintsSchema, researchUrlsSchema, splitResearchUrls } from "@/components/gtm-constraints";
import { ChevronDown, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useWorkspace } from "@/components/shell";
import { FounderRealityCheck, type FounderReality } from "@/components/founder-reality";
import { ResearchAllowance } from "@/components/allowance";
import { Button, cx, Field, Input, Notice, Select, Textarea } from "@/components/ui";
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
  const [reality, setReality] = useState<FounderReality>({});
  const [constraints, setConstraints] = useState(defaultConstraints);
  const [researchUrls, setResearchUrls] = useState("");
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = useAction(async () => {
    const url = urlSchema.safeParse(f.company_url);
    if (!url.success) return setErrors({ company_url: url.error.issues[0].message });
    const parsed = constraintsSchema.safeParse(constraints), links = researchUrlsSchema.safeParse(splitResearchUrls(researchUrls));
    if (!parsed.success) return setFormError(parsed.error.issues[0].message);
    if (!links.success) return setFormError(links.error.issues[0].message);
    setErrors({});
    setFormError(null);
    try {
      const report = await api<Report>(`/workspaces/${workspace.id}/reports`, { json: { ...f, gtm_constraints: parsed.data, research_urls: links.data, founder_reality: reality, company_url: url.data } });
      router.push(`${base}/reports/${report.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setFormError(errorMessage(e)); // inputs are kept so nothing has to be retyped
    }
  });

  return (
    <div className="mx-auto min-w-0 max-w-2xl">
      <header className="border-b border-line pb-6">
        <p className="text-sm text-ink-3">Source-backed company research</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-tight sm:text-4xl">Analyze your company</h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-2">
          Start with your website and what you offer. Get sourced research on your buyers,
          positioning and next experiments. Add context below to make it more specific.
        </p>
      </header>

      <form noValidate onSubmit={(e: FormEvent) => { e.preventDefault(); void submit.run(); }} className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <section aria-label="Company context" className="p-4 sm:p-7">
          <div className="space-y-6">
            <Field label="Website" hint="Start with your company website, like acme.com." error={errors.company_url}>
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
          </div>

          <button type="button" onClick={() => setMore(!more)} aria-expanded={more}
            aria-controls="company-context" className="mt-6 flex min-h-11 w-full items-center justify-between gap-3 border-t border-line pt-4 text-left text-sm font-medium text-trail hover:text-trail-strong">
            <span>More context (optional)</span>
            <ChevronDown aria-hidden className={cx("size-4 shrink-0 transition-transform", more && "rotate-180")} />
          </button>
          {more && (
            <div id="company-context" className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="What do you most want to learn?">
                {(id) => <Input id={id} value={f.goal} onChange={set("goal")} placeholder="e.g. Which segment to target first, and how to price" />}
              </Field></div>
              <Field label="Company name">{(id) => <Input id={id} value={f.company_name} onChange={set("company_name")} />}</Field>
              <Field label="Stage">{(id) => (
                <Select id={id} value={f.stage} onChange={set("stage")}>
                  <option value="">Not sure</option><option value="idea">Idea</option><option value="pre_revenue">Building, pre-revenue</option>
                  <option value="early_revenue">Early revenue</option><option value="growth">Growing</option>
                </Select>)}</Field>
              <div className="sm:col-span-2"><Field label="Who you sell to today">{(id) => <Input id={id} value={f.target_customers} onChange={set("target_customers")} placeholder="Roles, company size, industry" />}</Field></div>
              <Field label="Business model">{(id) => <Input id={id} value={f.business_model} onChange={set("business_model")} placeholder="B2B SaaS, marketplace…" />}</Field>
              <Field label="Current pricing">{(id) => <Input id={id} value={f.pricing} onChange={set("pricing")} placeholder="$49/seat/month" />}</Field>
              <Field label="Competitor source URLs (optional)">{(id) => <Input id={id} value={f.known_competitors} onChange={set("known_competitors")} />}</Field>
              <Field label="Region">{(id) => <Input id={id} value={f.geography} onChange={set("geography")} placeholder="US, EU…" />}</Field>
            </div>
          )}
        </section>
        <section aria-labelledby="personalize-report" className="space-y-4 border-t border-line p-4 sm:p-7">
          <div><h2 id="personalize-report" className="text-base font-semibold">Personalize your report</h2><p className="mt-1 text-sm text-ink-2">Optional. Add what you know, or leave these for later.</p></div>
          <details className="border-y border-line py-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Research sources and strategy constraints <span className="font-normal text-ink-3">(optional)</span></summary>
            <p className="mb-4 mt-2 text-sm text-ink-2">Set your budget, time and channels, or add up to six source URLs. Blank numbers stay unknown; 0 means none.</p>
            <GTMConstraintsForm value={constraints} onChange={setConstraints} urls={researchUrls} onUrlsChange={setResearchUrls} disabled={submit.pending} />
          </details>
          <FounderRealityCheck value={reality} onChange={setReality} disabled={submit.pending} />
        </section>
        <footer className="space-y-4 border-t border-line bg-sunken p-4 sm:p-7">
          {formError && <Notice tone="bad">{formError}</Notice>}
          <ResearchAllowance />
          <Button type="submit" size="lg" loading={submit.pending} className="w-full">Generate report</Button>
          <p className="text-xs leading-relaxed text-ink-3">
          Research uses accessible company pages and source URLs you provide; it does not include a general web-search service. Every claim in the report is labelled as a sourced fact, an interpretation or an assumption.
          </p>
        </footer>
      </form>
    </div>
  );
}
