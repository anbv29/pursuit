"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "../session";
import { buttonStyles } from "../ui";

const TOOLKIT = [
  "Complete company reports and evidence",
  "Report questions and section refresh",
  "All six experiment workflows",
  "Company discovery and report sharing",
  "Founder reality check and saved history",
  "Your connected Fo project assistant",
];

export function Pricing() {
  const { user } = useSession();
  return <section id="pricing" aria-labelledby="price-h" className="scroll-mt-24 pb-24">
    <p className="mb-3 font-ui text-xs font-semibold tracking-wide text-trail">OPEN TO EVERY FOUNDER</p>
    <h2 id="price-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">The whole toolkit. Free.</h2>
    <p className="mt-3 max-w-2xl text-ink-2">Research your business, question the findings and turn ideas into experiments. No subscription, checkout or research credits.</p>
    <div className="plan-card my-8 max-w-xl">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="plan-name">Explore</p>
          <p className="mt-1 flex items-baseline gap-1.5"><span className="plan-price">$0</span><span className="plan-per">free</span></p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-trail">Every account</p>
      </div>
      <ul className="plan-feats sm:grid-cols-2">
        {TOOLKIT.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-trail" aria-hidden />{f}</li>)}
      </ul>
    </div>
    <Link href={user ? "/w" : "/signup"} className={buttonStyles("primary", "lg")}>Start researching</Link>
    <p className="mt-4 max-w-2xl text-sm text-ink-3">Fair-use and provider capacity limits apply. Research uses accessible public pages and source URLs you supply; independent market evidence may be incomplete. Fo uses your own Wajo connection and its limits.</p>
  </section>;
}
