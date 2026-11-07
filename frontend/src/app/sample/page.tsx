import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/marketing/landing-nav";
import { Footer } from "@/components/marketing/footer";
import { Claims, Section, SourcesProvider } from "@/components/report/parts";
import { SourceReceipt } from "@/components/report/gtm";
import { buttonStyles } from "@/components/ui";
import { publicSample as sample } from "@/lib/public-sample";

export const metadata: Metadata = {
  title: "Cal.com research brief, with receipts",
  description: "Read a real public research brief. Inspect the sources, separate interpretations from facts, and see what still needs testing. No signup required.",
};

export default function SampleReport() {
  return <div className="marketing-page min-h-screen">
    <LandingNav />
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <header className="space-y-4">
        <p className="text-sm font-semibold text-trail">Every claim has a receipt, or an explicit uncertainty label.</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{sample.company}: {sample.title}</h1>
        <p className="text-ink-2">{sample.scope}</p>
        <p className="text-sm text-ink-3">Public sample · Sources reviewed {sample.checked} · No signup required</p>
      </header>
      <SourcesProvider sources={sample.sources}>
        <Section id="facts" title="What the source supports"><Claims items={sample.facts} /></Section>
        <Section id="interpretations" title="What we infer"><Claims items={sample.interpretations} /></Section>
        <Section id="hypotheses" title="Unverified, test before acting"><Claims items={sample.hypotheses} /></Section>
        <Section id="unknowns" title="What we cannot conclude">
          <ul className="list-disc space-y-2 pl-5 text-sm text-ink-2">{sample.unknowns.map(text => <li key={text}>{text}</li>)}</ul>
        </Section>
        <Section id="next-test" title={sample.nextTest.title}>
          <p>{sample.nextTest.action}</p><p className="mt-3 text-sm text-ink-2">{sample.nextTest.decision}</p>
          <p className="mt-3 text-sm text-ink-2">Evidence against the idea: {sample.nextTest.counterevidence}</p>
        </Section>
        <Section id="sources" title="Inspect the receipt">
          {sample.sources.map(source => <SourceReceipt key={source.id} source={source} />)}
        </Section>
      </SourcesProvider>
      <div className="space-y-3 border-t border-line pt-6 print:hidden">
        <p className="text-ink-2">Bring your own product. Keep the sources, uncertainty and next tests together.</p>
        <Link href="/signup" className={buttonStyles("primary")}>Research your product</Link>
      </div>
    </main><Footer />
  </div>;
}
