"use client";

import { Beaker, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/brand";
import { RequireAuth, useSession } from "@/components/session";
import { Button, Card, cx, Field, Input, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { Workspace } from "@/lib/types";

function Onboarding() {
  const { user } = useSession();
  const router = useRouter();
  const [name, setName] = useState(user ? `${user.name.split(" ")[0]}'s startup` : "");
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useAction(async () => {
    if (!name.trim()) return setError("Give your workspace a name.");
    setError(null);
    try {
      const ws = await api<Workspace>("/workspaces", { json: { name: name.trim(), with_demo_data: demo } });
      localStorage.setItem("pursuit.lastWorkspace", ws.id);
      router.replace(demo ? `/w/${ws.id}` : `/w/${ws.id}/experiments/new`);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const choices = [
    { demo: false, icon: Beaker, title: "Start my first experiment", body: "An empty workspace for your real data. You'll be guided through your first hypothesis." },
    { demo: true, icon: Sparkles, title: "Explore with demo data", body: "Four synthetic experiments, clearly labelled as demo. Nothing here is a real result." },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Set up your workspace</h1>
      <p className="mt-2 text-ink-2">
        A workspace holds your experiments, evidence and outreach. Teammates you add can see everything in it.
      </p>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void create.run(); }} className="mt-8 space-y-6">
        <Field label="Workspace name">
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />}
        </Field>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink-2">How do you want to start?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.map((c) => (
              <label key={String(c.demo)} className="cursor-pointer">
                <input type="radio" name="start" className="peer sr-only" checked={demo === c.demo} onChange={() => setDemo(c.demo)} />
                <Card as="div" className={cx("h-full p-4 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-trail",
                  demo === c.demo ? "border-trail bg-trail-soft/40" : "hover:border-line-strong")}>
                  <c.icon className={cx("size-5", c.demo ? "text-demo" : "text-trail")} aria-hidden />
                  <p className="mt-2 font-medium">{c.title}</p>
                  <p className="mt-1 text-[13px] text-ink-3">{c.body}</p>
                </Card>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button type="submit" loading={create.pending}>{demo ? "Create demo workspace" : "Create workspace"}</Button>
      </form>
    </main>
  );
}

export default function OnboardingPage() {
  return <RequireAuth><Onboarding /></RequireAuth>;
}
