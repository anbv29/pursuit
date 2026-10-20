"use client";

import Link from "next/link";
import { PUBLIC_PLANS } from "@/lib/plans";
import { useSession } from "../session";
import { buttonStyles, cx } from "../ui";

/** Public prices come from the same server catalogue that enforces checkout. */
export function Pricing() {
  const { user } = useSession();
  return <section id="pricing" aria-labelledby="price-h" className="scroll-mt-24 pb-24">
    <div className="max-w-2xl">
      <p className="mb-3 font-ui text-xs font-semibold tracking-wide text-trail">A LITTLE CLARITY GOES A LONG WAY</p>
      <h2 id="price-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Start small. Research when you need it.</h2>
      <p className="mt-3 text-ink-2">Choose a plan per workspace. Your saved evidence and manual experiments stay accessible on every plan.</p>
    </div>
    <div className="pricing-grid mt-8 grid overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-2 lg:grid-cols-4">{PUBLIC_PLANS.map(plan => <div key={plan.id} className={cx("pricing-column flex min-w-0 flex-col p-6", plan.id === "founder" && "bg-accent-soft/40")}>
          <h3 className="font-ui text-lg font-semibold">{plan.name}</h3>
          <p className="mt-3"><span className="font-ui text-4xl font-semibold tabular-nums">${plan.price_cents / 100}</span><span className="ml-1 text-sm text-ink-3">{plan.interval === "month" ? "/month" : plan.interval === "once" ? "once" : "free"}</span></p>
          <ul className="my-6 flex-1 space-y-3 text-sm text-ink-2">
            <li>{plan.reports ? `${plan.reports} research credit${plan.reports === 1 ? "" : "s"}` : "1 four-section research preview per account"}</li>
            {plan.id === "free" && <li>Sample full report to explore</li>}
            <li>{plan.questions ? `${plan.questions} AI answers` : "Free rule-based recommendations"}</li>
            <li>{plan.seats} member{plan.seats === 1 ? "" : "s"}, including the owner</li>
            <li>All six manual experiment workflows</li>
            {plan.id !== "free" && <li>Full company report, first-week plan and print/PDF export</li>}
            {["founder", "team"].includes(plan.id) && <li>Section refresh, company discovery and share links</li>}
          </ul>
          <Link href={user ? "/w" : "/signup"} className={buttonStyles(plan.id === "founder" ? "primary" : "secondary", "md", "w-full")}>{plan.id === "free" ? "Explore free" : "Choose in your workspace"}</Link>
        </div>)}</div>
    <div className="mx-auto mt-6 max-w-3xl space-y-2 text-sm leading-relaxed text-ink-3">
      <p>Prices are in USD and include applicable taxes. No extra GST is added at checkout. Monthly plans renew automatically; unused monthly allowances expire. Single Report credits do not expire. No automatic overage charges.</p>
      <p>One research credit covers a full report, section refresh or company discovery search, even when no companies match. Refresh and discovery need Founder or Team. One AI answer covers a report question or optional AI-assisted recommendation.</p>
      <p>Creating an account is free. Purchases happen inside an owner&apos;s workspace only when payments are configured. Sample workspaces cannot be billed; simulated actions do not send anything. Fo and email-provider charges are separate.</p>
    </div>
  </section>;
}
