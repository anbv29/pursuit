"use client";

import Link from "next/link";
import { useSession } from "../session";
import { buttonStyles } from "../ui";

export function Pricing() {
  const { user } = useSession();
  return <section id="pricing" aria-labelledby="price-h" className="scroll-mt-24 pb-24">
    <p className="mb-3 font-ui text-xs font-semibold tracking-wide text-trail">OPEN TO EVERY FOUNDER</p>
    <h2 id="price-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">The whole toolkit. Free.</h2>
    <p className="mt-3 max-w-2xl text-ink-2">Research your business, question the findings and turn ideas into experiments. No subscription, checkout or research credits.</p>
    <ul className="my-8 grid gap-4 rounded-2xl border border-line bg-surface p-6 text-ink-2 sm:grid-cols-2">
      {["Complete company reports and evidence", "Report questions and section refresh", "All six experiment workflows", "Company discovery and report sharing", "Founder reality check and saved history", "Your connected Fo project assistant"].map(item => <li key={item}>{item}</li>)}
    </ul>
    <Link href={user ? "/w" : "/signup"} className={buttonStyles("primary", "lg")}>Start researching free</Link>
    <p className="mt-4 max-w-2xl text-sm text-ink-3">Fair-use and provider capacity limits apply. Research uses accessible public pages and source URLs you supply; independent market evidence may be incomplete. Fo uses your own Wajo connection and its limits.</p>
  </section>;
}
