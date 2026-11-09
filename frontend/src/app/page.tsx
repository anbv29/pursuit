import { LensLoader } from "@/components/lens-loader";
import { Footer } from "@/components/marketing/footer";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { HeroCta, LandingNav, MobileCtaDock } from "@/components/marketing/landing-nav";
import { Pricing } from "@/components/marketing/pricing";
import { Capabilities, Questions } from "@/components/marketing/capabilities";
import { TRUST_POINTS } from "@/lib/ui-demo/demo-data";
import styles from "@/components/marketing/studio.module.css";

export default function Home() {
  return (
    <div className={`marketing-page ${styles.page}`}>
      <LensLoader />
      <LandingNav />

      <main className={styles.container}>
        <section className={`pursuit-hero ${styles.hero}`}>
          <div className={styles.heroCopy}>
            <h1>Every claim<br />has a receipt.</h1>
            <p>
              Research your market, customers and competition with sources you can inspect. Pursuit links the evidence, flags what is unverified and helps you decide what to test next.
            </p>
            <div className={styles.heroActions}><HeroCta /></div>
            <p>Real product. Public sources. Read the sample without signing up.</p>
          </div>
          <div className="min-w-0">
            <HeroDemo />
          </div>
        </section>

        <section aria-label="What you can rely on" className={styles.trust}>
          <ul>
            {TRUST_POINTS.map((point) => <li key={point.title}>
              <strong>{point.title}</strong>
              <p>{point.body}</p>
            </li>)}
          </ul>
        </section>

        <section id="how-it-works" aria-labelledby="hiw-h" className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2 id="hiw-h">How it works</h2>
            <p>From a business question to a research report, a practical test and a recommendation grounded in your recorded results.</p>
          </div>
          <HowItWorks />
        </section>

        <Capabilities />
        <Pricing />
        <Questions />
      </main>

      <Footer />
      <div aria-hidden className="h-24 lg:hidden" />
      <MobileCtaDock />
    </div>
  );
}
