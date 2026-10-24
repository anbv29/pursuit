"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { CriteriaEditor, isRate, KNOWN_METRICS, type CriterionDraft } from "@/components/criteria-editor";
import { useWorkspace } from "@/components/shell";
import { Button, Card, cx, DemoBadge, Field, Input, Notice, Skeleton, Textarea } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { STAGE_LABEL } from "@/lib/labels";
import type { ExperimentDetail, Template, UseCase } from "@/lib/types";

const schema = z.object({
  title: z.string().trim().min(3, "At least 3 characters.").max(160),
  hypothesis: z.string().trim().min(10, "State the belief you're testing in a full sentence.").max(4000),
  target_audience: z.string().max(2000),
});

function NewExperiment() {
  const { workspace, base } = useWorkspace();
  const { toast } = useFeedback();
  const router = useRouter();
  const preset = useSearchParams().get("type") as UseCase | null;
  const templates = useApi<Template[]>("/use-cases");
  const [useCase, setUseCase] = useState<UseCase | null>(preset);
  const [form, setForm] = useState({ title: "", hypothesis: "", target_audience: "" });
  // Edited criteria per use case; until edited, the template's defaults apply.
  const [edited, setEdited] = useState<Partial<Record<UseCase, CriterionDraft[]>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const tpl = templates.data?.find((t) => t.use_case === useCase);
  const criteria: CriterionDraft[] = (useCase && edited[useCase]) || tpl?.default_criteria || [];
  const setCriteria = (c: CriterionDraft[]) => useCase && setEdited((e) => ({ ...e, [useCase]: c }));

  const create = useAction(async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    try {
      const exp = await api<ExperimentDetail>(`/workspaces/${workspace.id}/experiments`, {
        json: { use_case: useCase, ...parsed.data, criteria },
      });
      toast("success", "Experiment created.");
      router.push(`${base}/experiments/${exp.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setFormError(errorMessage(e)); // input is preserved for retry
    }
  });

  if (templates.loading) return <Skeleton className="mx-auto h-96 max-w-4xl" />;
  if (templates.error) return <Notice tone="bad">{templates.error.message}</Notice>;

  if (!useCase || !tpl) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">What do you want to find out?</h1>
        <p className="mt-1 text-sm text-ink-3">Every experiment follows the same loop. Pick the question you are answering.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.data?.map((t) => (
            <button key={t.use_case} onClick={() => setUseCase(t.use_case)}
              className="enter-rise rounded-[16px] border border-line bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-trail/50">
              <p className="font-display text-lg font-semibold text-ink">{t.name}</p>
              <p className="mt-1 text-[13px] text-ink-3">{t.summary}</p>
              <p className="mt-3 text-xs text-ink-3">{t.actions.length ? `Actions via Fo: ${t.actions.map((a) => a.replace("_", " ")).join(", ")}` : "Research and analysis only"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const label = (m: string) => KNOWN_METRICS.find((k) => k.value === m)?.label ?? m;

  const steps = ["Config", "Hypothesis", "Success criterion", "Plan", "Review"] as const;
  const advance = (n: number) => {
    const next = { ...errors };
    if (n === 0 && form.title.trim().length < 3) next.title = "At least 3 characters.";
    else next.title = errors.title && form.title.trim().length >= 3 ? "" : next.title;
    if (n === 1 && form.hypothesis.trim().length < 10) next.hypothesis = "State the belief you're testing in a full sentence.";
    else next.hypothesis = errors.hypothesis && form.hypothesis.trim().length >= 10 ? "" : next.hypothesis;
    setErrors(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
    setStep(Math.min(n + 1, 4));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => setUseCase(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" />
        Change type
      </button>
      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        {/* Steps rail: desktop */}
        <nav aria-label="Wizard steps" className="hidden lg:block">
          <Card className="sticky top-20 p-3">
            <ol className="space-y-1">
              {steps.map((label, i) => (
                <li key={label}>
                  <button
                    onClick={() => i < step && setStep(i)}
                    aria-current={i === step ? "step" : undefined}
                    className={cx(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      i === step ? "bg-accent-soft font-semibold text-trail-strong" : i < step ? "text-ink-2 hover:bg-[var(--inset)]" : "text-ink-3",
                    )}
                  >
                    <span className={cx(
                      "grid size-5 shrink-0 place-items-center rounded-full border text-[11px]",
                      i < step ? "border-trail bg-trail text-white" : i === step ? "border-trail-strong text-trail-strong" : "border-line",
                    )}>
                      {i < step ? <Check className="size-3" aria-hidden /> : i + 1}
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </nav>

        <div>
          {/* Progress dots: mobile */}
          <div className="mb-4 flex items-center gap-1.5 lg:hidden" aria-hidden>
            {steps.map((label, i) => (
              <span key={label} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-trail" : "bg-line")} />
            ))}
          </div>
          <p className="text-xs font-medium text-trail">{tpl.name}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{steps[step]}</h1>

          <Card className="mt-4 p-5 sm:p-6">
            {formError && <Notice tone="bad">{formError}</Notice>}

            {step === 0 && (
              <div className="space-y-5">
                <p className="text-sm text-ink-2">Setting up a <b>{tpl.name}</b>. Every experiment follows the same loop.</p>
                <Field label="Name" error={errors.title}>
                  {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} value={form.title} onChange={set("title")} placeholder="e.g. Clinic claims pain" />}
                </Field>
                <Field label="Target audience" error={errors.target_audience} hint="Be specific: role, company size, geography.">
                  {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.target_audience} value={form.target_audience} onChange={set("target_audience")} />}
                </Field>
              </div>
            )}

            {step === 1 && (
              <Field label="Hypothesis" error={errors.hypothesis} hint="A falsifiable belief: who, what behaviour, how much.">
                {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!errors.hypothesis} rows={3} value={form.hypothesis} onChange={set("hypothesis")} placeholder={tpl.hypothesis_hint} />}
              </Field>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink-2">Success criteria <span className="font-normal text-ink-3">(decided before you see results)</span></p>
                <CriteriaEditor value={criteria} onChange={setCriteria} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 text-sm text-ink-2">
                <p className="font-semibold text-ink">The plan</p>
                <p>Starts at <b>{STAGE_LABEL.hypothesis}</b>. External actions will always wait for your approval.</p>
                <p>{tpl.actions.length ? `Actions via Fo: ${tpl.actions.map((a) => a.replace("_", " ")).join(", ")}` : "Research and analysis only."}</p>
                {workspace.is_demo && <DemoBadge />}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-1">
                <p className="font-display text-xl font-semibold text-ink">{form.title || "Untitled experiment"}</p>
                <p className={cx("mt-2 text-sm", form.hypothesis ? "text-ink-2" : "italic text-ink-3")}>{form.hypothesis || tpl.hypothesis_hint}</p>
                {form.target_audience && <p className="mt-2 text-xs text-ink-3">Audience: {form.target_audience}</p>}
                <p className="mt-4 text-xs font-medium text-ink-3">It succeeds if</p>
                <ul className="mt-1.5 space-y-1">
                  {criteria.length === 0 && <li className="text-sm text-flag">No criteria, results cannot be judged.</li>}
                  {criteria.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 size-3.5 shrink-0 text-trail" />
                      <span>{label(c.metric)} {c.comparator} {isRate(c.metric) ? `${Math.round(c.target * 100)}%` : c.target}
                        {c.min_sample > 0 && <span className="text-ink-3"> (n ≥ {c.min_sample})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sticky footer: Back / Continue (Review swaps Continue for Create) */}
            <div className="sticky bottom-20 mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 sm:static lg:bottom-4">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(Math.max(step - 1, 0))}>Back</Button>
              {step < 4 ? (
                <Button onClick={() => advance(step)} className="shimmer-btn">Continue <ArrowRight className="size-4" aria-hidden /></Button>
              ) : (
                <Button type="submit" loading={create.pending} onClick={() => void create.run()} className="shimmer-btn">Create experiment</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewExperimentPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}><NewExperiment /></Suspense>;
}
