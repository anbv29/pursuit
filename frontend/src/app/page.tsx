import { Eye, FileCheck2, Lock, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/marketing/footer";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { HeroCta, LandingNav } from "@/components/marketing/landing-nav";
import { Pricing } from "@/components/marketing/pricing";
import { Capabilities, Questions } from "@/components/marketing/capabilities";
import { TRUST_POINTS } from "@/lib/ui-demo/demo-data";

const TRUST_ICONS = [FileCheck2, ShieldCheck, Eye, Lock];

export default function Home() {
  return (
    <div className="marketing-page min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="pursuit-hero grid items-start gap-12 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="enter-rise min-w-0 lg:pt-8">
            <p className="mb-7 flex items-center gap-3 font-ui text-xs font-semibold tracking-[0.08em] text-ink-3">
              <span className="h-px w-7 bg-accent" aria-hidden /> YOUR NEXT MOVE, RESEARCHED
            </p>
            <h1 className="font-display text-[43px] font-medium leading-[1.06] tracking-[-0.055em] text-ink sm:text-[60px] lg:text-[62px]">
              A clearer picture.<br /><span className="text-trail">A smarter next move.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-7 text-ink-2">
              Your business has questions. Start with your website and an idea. Get a source-linked view of your customers, competition and pricing — and a practical plan for what to test next.
            </p>
            <div className="mt-8"><HeroCta /></div>
            <p className="mt-5 text-sm text-ink-3">Explore a sample first. No card needed.</p>
          </div>
          <div className="enter-rise min-w-0" style={{ "--i": 2 } as React.CSSProperties}>
            <HeroDemo />
          </div>
        </section>

        {/* Trust band: commitments, not logos or numbers */}
        <section aria-label="What you can rely on" className="pb-20">
          <ul className="grid gap-6 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((t, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <li key={t.title} className="flex min-w-0 items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center text-trail-strong"><Icon className="size-[18px]" aria-hidden /></span>
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

      <Footer />
    </div>
  );
}
