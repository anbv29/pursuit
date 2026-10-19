import { Eye, FileCheck2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { HeroCta, LandingNav } from "@/components/marketing/landing-nav";
import { Pricing } from "@/components/marketing/pricing";
import { Capabilities, Questions } from "@/components/marketing/capabilities";
import { TRUST_POINTS } from "@/lib/ui-demo/demo-data";

const TRUST_ICONS = [FileCheck2, ShieldCheck, Eye, Lock];

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="enter-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-surface/70 px-3 py-1 text-[13px] font-medium text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden /> Research and validation for founders
            </p>
            <h1 className="font-display text-[48px] font-normal leading-[1.04] tracking-[-0.025em] text-ink sm:text-6xl lg:text-[76px]">
              Know what to test next. <span className="block text-trail">Build on evidence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Start with your website and a description of your business. Pursuit helps you research customers,
              competitors, pricing and positioning, then turn the findings into experiments you can measure.
            </p>
            <div className="mt-8"><HeroCta /></div>
          </div>
          <div className="enter-rise lg:pl-4" style={{ "--i": 2 } as React.CSSProperties}>
            <HeroDemo />
          </div>
        </section>

        {/* Trust band: commitments, not logos or numbers */}
        <section aria-label="What you can rely on" className="pb-20">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((t, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <li key={t.title} className="surface flex items-start gap-3 rounded-[var(--radius-lg)] p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-trail-strong"><Icon className="size-[18px]" aria-hidden /></span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{t.title}</span>
                    <span className="block text-[13px] text-ink-3">{t.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="hiw-h" className="scroll-mt-24 pb-24">
          <div className="mb-8 max-w-2xl">
            <h2 id="hiw-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-3 text-lg text-ink-2">From a business question to a research report, a practical test and a recommendation grounded in your recorded results.</p>
          </div>
          <HowItWorks />
        </section>

        {/* Pricing */}
        <Capabilities />
        <Pricing />
        <Questions />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-3 sm:px-6">
          <Logo />
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/signup" className="hover:text-ink">Create an account</Link>
          </nav>
          <p>Pursuit. Built for evidence, not vanity metrics.</p>
        </div>
      </footer>
    </div>
  );
}
