"use client";

import { Beaker, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand";
import { RequireAuth, useSession } from "@/components/session";
import { ThemeToggle } from "@/components/theme";
import { Button, Card, cx, Field, Glass, Input, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { Workspace } from "@/lib/types";

function Onboarding() {
  const { user } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user ? `${user.name.split(" ")[0]}'s startup` : "");
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const create = useAction(async () => {
    if (!name.trim()) return setError("Give your workspace a name.");
    setError(null);
    try {
      const ws = await api<Workspace>("/workspaces", { json: { name: name.trim(), with_demo_data: demo } });
      try { localStorage.setItem("pursuit.lastWorkspace", ws.id); } catch { /* Storage is optional. */ }
      router.replace(demo ? `/w/${ws.id}` : `/w/${ws.id}/reports/new`);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const choices = [
    { demo: false, icon: Beaker, title: "Analyze my company", body: "Enter your website and get a full sourced GTM report, then track the experiments it recommends." },
    { demo: true, icon: Sparkles, title: "Explore with demo data", body: "Four synthetic experiments, clearly labelled as demo. Nothing here is a real result." },
  ];

  const steps = ["Name your workspace", "Choose how to start"];
  const next = () => {
    if (!name.trim()) return setError("Give your workspace a name.");
    setError(null);
    setStep(1);
  };

  return (
    <main className="app-shell mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between"><Logo /><ThemeToggle /></div>
      <Glass className="enter-rise p-6 sm:p-9">
        <ol className="flex items-center gap-3" aria-label="Setup progress">
          {steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-3" aria-current={i === step ? "step" : undefined}>
              <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                i < step ? "bg-accent-strong text-accent-ink" : i === step ? "bg-surface text-trail ring-2 ring-accent" : "bg-[var(--inset)] text-ink-3")}>
                {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cx("hidden text-sm sm:inline", i === step ? "font-semibold text-ink" : "text-ink-3")}>{label}</span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">Step {step + 1} of {steps.length}: {steps[step]}</p>

        <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (step === 0) next(); else void create.run(); }} className="mt-8">
          {step === 0 ? (
            <div key="s0" className="enter-rise space-y-5">
              <div>
                <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight">What should we call your workspace?</h1>
                <p className="mt-2 text-ink-2">It holds your reports, experiments and outreach. Teammates you add can see everything in it.</p>
              </div>
              <Field label="Workspace name">
                {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus className="h-12 text-base" />}
              </Field>
            </div>
          ) : (
            <fieldset key="s1" className="enter-rise">
              <legend className="font-display text-[28px] font-bold leading-tight tracking-tight">How do you want to start?</legend>
              <p className="mt-2 text-ink-2">You can do the other one later.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {choices.map((c) => (
                  <label key={String(c.demo)} className="cursor-pointer">
                    <input type="radio" name="start" className="peer sr-only" checked={demo === c.demo} onChange={() => setDemo(c.demo)} />
                    <Card as="div" className={cx("press h-full p-5 transition-[border-color,box-shadow,background-color] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                      demo === c.demo ? "border-accent bg-accent-soft/50 shadow-[0_10px_30px_-16px_var(--accent)]" : "hover:border-line-strong")}>
                      <span className={cx("grid size-10 place-items-center rounded-xl", c.demo ? "bg-demo-soft text-demo" : "bg-accent-soft text-trail-strong")}>
                        <c.icon className="size-5" aria-hidden />
                      </span>
                      <p className="mt-3 font-semibold">{c.title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{c.body}</p>
                    </Card>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {error && <div className="mt-5"><Notice tone="bad">{error}</Notice></div>}
          <div className="mt-8 flex items-center justify-between gap-3">
            {step === 1 ? <Button type="button" variant="ghost" onClick={() => setStep(0)}>Back</Button> : <span />}
            {step === 0
              ? <Button type="submit" size="lg">Continue</Button>
              : <Button type="submit" size="lg" loading={create.pending}>{demo ? "Create demo workspace" : "Create workspace"}</Button>}
          </div>
        </form>
      </Glass>
    </main>
  );
}

export default function OnboardingPage() {
  return <RequireAuth><Onboarding /></RequireAuth>;
}
