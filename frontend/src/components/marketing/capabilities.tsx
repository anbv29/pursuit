const WORKFLOWS = [
  ["Find your first customers", "Compare customer groups, keep sourced prospect research and test which audience has the strongest need."],
  ["Test willingness to pay", "Track budgets, current spending and pricing feedback. Keep verbal interest separate from actual commitments."],
  ["Compare your message", "Create outreach variants and record replies. Compare rates with sample sizes and uncertainty."],
  ["Understand the problem", "Record interviews, workarounds, recurring pain and contradictory answers before deciding what to build."],
  ["Map the competition", "Compare competitors, pricing and positioning with source links. See where information is missing."],
  ["Find funnel drop-offs", "Import a CSV or enter stage counts. See conversion rates and design tests for competing explanations."],
];

export function Capabilities() {
  return <section aria-labelledby="capabilities-h" className="pb-24">
    <div className="grid gap-8 border-t border-line pt-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
      <div>
        <p className="text-sm font-semibold text-trail">One place to research and learn</p>
        <h2 id="capabilities-h" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">A company report is your starting point.</h2>
        <p className="mt-4 leading-relaxed text-ink-2">Enter your website, describe your offer and tell Pursuit who you hope to serve. A research report brings together your market, potential customers, competitors, pricing, positioning and a first-week plan.</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-3">Research suggests what to try. Real interviews, commitments and measured results tell you whether it works. Use the six workflows to keep that evidence together.</p>
      </div>
      <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
        {WORKFLOWS.map(([title, body]) => <div key={title} className="border-t border-line pt-4">
          <dt className="font-ui text-base font-semibold">{title}</dt>
          <dd className="mt-2 text-sm leading-relaxed text-ink-2">{body}</dd>
        </div>)}
      </dl>
    </div>
  </section>;
}

export function Questions() {
  const answers = [
    ["Do I need to know startup terminology?", "No. Start with a plain-language description of your business. Reading controls explain terms and let you switch between a guided view and more detail."],
    ["Does research prove that people will buy?", "No. Reports link available sources and highlight assumptions and limitations. Customer conversations, actual commitments and measured outcomes provide stronger evidence."],
    ["Will Pursuit contact people automatically?", "Every external action needs your approval. Real outreach also needs a connected Fo account and the required permissions. Simulated actions are labelled and never send anything."],
    ["Can I explore before paying?", "Yes. Explore includes a labelled sample report and all six manual experiment workflows. Generating a new company report needs a research credit and an available research service."],
    ["Where do I manage a paid plan?", "Workspace owners can see allowances, available checkout options and billing management in Plans & billing. A disabled checkout means purchases are not available in that environment."],
  ];
  return <section aria-labelledby="questions-h" className="mx-auto max-w-3xl pb-24">
    <h2 id="questions-h" className="mb-6 font-display text-3xl font-bold tracking-tight">Before you start</h2>
    {answers.map(([q, a]) => <details key={q} className="group border-t border-line py-5">
      <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{a}</p>
    </details>)}
  </section>;
}
