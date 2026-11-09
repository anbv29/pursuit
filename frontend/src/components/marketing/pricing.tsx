"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "../session";
import { buttonStyles } from "../ui";
import styles from "./studio.module.css";

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
  return <section id="pricing" aria-labelledby="price-h" className={styles.section}>
    <div className={styles.toolkit}>
      <div>
        <h2 id="price-h">The whole toolkit. Free.</h2>
        <p className="mt-5 leading-relaxed">Research your business, question the findings and turn ideas into experiments. No subscription, checkout or research credits.</p>
        <p className={styles.price}>$0<span>Every account</span></p>
        <Link href={user ? "/w" : "/signup"} className={buttonStyles("primary", "lg", styles.toolkitCta)}>Start researching</Link>
      </div>
      <ul className={styles.toolkitList}>
        {TOOLKIT.map((f) => <li key={f}><Check className="size-4 shrink-0" aria-hidden />{f}</li>)}
      </ul>
    </div>
    <p className="mt-4 max-w-2xl text-sm text-ink-3">Fair-use and provider capacity limits apply. Research uses accessible public pages and source URLs you supply; independent market evidence may be incomplete. Fo uses your own Wajo connection and its limits.</p>
  </section>;
}
