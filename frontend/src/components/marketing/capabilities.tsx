import { CircleDollarSign, Filter, MessageCircleQuestion, MessageSquare, Scale, Users } from "lucide-react";
import type { ComponentType } from "react";

const WORKFLOWS: [string, string, ComponentType<{ className?: string }>][] = [
  ["Find your first customers", "Compare customer groups, keep sourced prospect research and test which audience has the strongest need.", Users],
  ["Test willingness to pay", "Track budgets, current spending and pricing feedback. Keep verbal interest separate from actual commitments.", CircleDollarSign],
  ["Compare your message", "Create outreach variants and record replies. Compare rates with sample sizes and uncertainty.", MessageSquare],
  ["Understand the problem", "Record interviews, workarounds, recurring pain and contradictory answers before deciding what to build.", MessageCircleQuestion],
  ["Map the competition", "Compare competitors, pricing and positioning with source links. See where information is missing.", Scale],
  ["Find funnel drop-offs", "Import a CSV or enter stage counts. See conversion rates and design tests for competing explanations.", Filter],
];

export function Capabilities() {
  return <section id="capabilities" aria-labelledby="capabilities-h" className="scroll-mt-28 pb-24">
    <div className="grid gap-8 border-t border-line pt-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
      <div>
        <p className="text-sm font-semibold text-trail">One place to research and learn</p>
        <h2 id="capabilities-h" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">A company report is your starting point.</h2>
        <p className="mt-4 leading-relaxed text-ink-2">Enter your website, describe your offer and tell Pursuit who you hope to serve. A research report brings together your market, potential customers, competitors, pricing, positioning and a first-week plan.</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-3">Research suggests what to try. Real interviews, commitments and measured results tell you whether it works. Use the six workflows to keep that evidence together.</p>
      </div>
      <ul className="bento-grid">
        {WORKFLOWS.map(([title, body, Icon], i) => <li key={title} className={i === 0 ? "bento-tile bento-tile-wide" : "bento-tile"}>
          <span className="bento-ico"><Icon className="size-[18px]" aria-hidden /></span>
          <h3 className="font-ui text-base font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
        </li>)}
      </ul>
    </div>
  </section>;
}

export function Questions() {
  const answers = [
    ["Do I need to know startup terminology?", "No. Start with a plain-language description of your business. Reading controls explain terms and let you switch between a guided view and more detail."],
    ["Does research prove that people will buy?", "No. Reports link available sources and highlight assumptions and limitations. Customer conversations, actual commitments and measured outcomes provide stronger evidence."],
    ["Will Pursuit contact people automatically?", "Every external action needs your approval. Real outreach also needs a connected Fo account and the required permissions. Simulated actions are labelled and never send anything."],
    ["Where should I start?", "Explore the sample report or enter your website to create a company report. You can also start with a focused customer experiment. Research depends on provider availability."],
    ["What can I do with Pursuit?", "Create company reports, ask follow-up questions, refresh findings, share research and run experiments. Fair-use and provider capacity limits apply."],
  ];
  return <section aria-labelledby="questions-h" className="mx-auto max-w-3xl pb-24">
    <h2 id="questions-h" className="mb-6 font-display text-3xl font-bold tracking-tight">Before you start</h2>
    {answers.map(([q, a]) => <details key={q} className="group border-t border-line py-5">
      <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{a}</p>
    </details>)}
  </section>;
}
