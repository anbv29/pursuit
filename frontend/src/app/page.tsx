"use client";

import { ArrowRight, FlaskConical, ShieldCheck, Scale } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { useSession } from "@/components/session";
import { STAGE_LABEL } from "@/lib/labels";
import type { Stage } from "@/lib/types";

const STAGES = Object.keys(STAGE_LABEL) as Stage[];

const PILLARS = [
  { icon: FlaskConical, title: "Experiments, not opinions", body: "Every idea becomes a hypothesis with success criteria you set before seeing results." },
  { icon: ShieldCheck, title: "Real actions, human-approved", body: "Outreach and scheduling run through Fo only after you approve each action. Demo runs are always labelled." },
  { icon: Scale, title: "Honest recommendations", body: "Continue, iterate, pivot or stop — with the evidence, counterevidence, sample sizes and limits shown." },
];

export default function Home() {
  const { user, ready } = useSession();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {ready && user ? (
            <Link href="/w" className="rounded-lg bg-trail px-3.5 py-2 font-medium text-white hover:bg-trail-strong">Open workspace</Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-ink-2 hover:bg-sunken">Sign in</Link>
              <Link href="/signup" className="rounded-lg bg-trail px-3.5 py-2 font-medium text-white hover:bg-trail-strong">Start free</Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="pb-14 pt-16 md:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
            <span className="size-1.5 rounded-full bg-trail" /> GTM experimentation for founders
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            Stop guessing who buys.<br /><span className="text-trail">Run the experiment.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Pursuit turns go-to-market hunches into measurable experiments, gathers evidence, takes approved
            real-world actions, and tells you plainly what the data supports.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/w" : "/signup"} className="inline-flex items-center gap-2 rounded-lg bg-trail px-5 py-2.5 font-medium text-white shadow-card hover:bg-trail-strong">
              {user ? "Go to your workspace" : "Create your first experiment"} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section aria-label="Experiment lifecycle" className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-3">One loop for every GTM question</p>
          <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span className={`rounded-md px-2.5 py-1 ${i === 4 ? "bg-flag-soft text-flag" : i === 8 ? "bg-trail text-white" : "bg-sunken text-ink-2"}`}>
                  {STAGE_LABEL[s]}
                </span>
                {i < STAGES.length - 1 && <span className="text-line-strong" aria-hidden>→</span>}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 py-14 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-line bg-surface p-5">
              <Icon className="size-5 text-trail" aria-hidden />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-ink-2">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-ink-3">Pursuit — built for evidence, not vanity metrics.</footer>
    </div>
  );
}
