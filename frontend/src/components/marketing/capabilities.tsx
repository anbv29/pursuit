import styles from "./studio.module.css";

const WORKFLOWS = [
  ["Find your first customers", "Compare customer groups, keep sourced prospect research and test which audience has the strongest need."],
  ["Test willingness to pay", "Track budgets, current spending and pricing feedback. Keep verbal interest separate from actual commitments."],
  ["Compare your message", "Create outreach variants and record replies. Compare rates with sample sizes and uncertainty."],
  ["Understand the problem", "Record interviews, workarounds, recurring pain and contradictory answers before deciding what to build."],
  ["Map the competition", "Compare competitors, pricing and positioning with source links. See where information is missing."],
  ["Find funnel drop-offs", "Import a CSV or enter stage counts. See conversion rates and design tests for competing explanations."],
];

export function Capabilities() {
  return <section id="capabilities" aria-labelledby="capabilities-h" className={styles.section}>
    <div className={styles.sectionHeading}>
      <div>
        <h2 id="capabilities-h">A company report is your starting point.</h2>
      </div>
      <div>
        <p className="mt-4 leading-relaxed text-ink-2">Enter your website, describe your offer and tell Pursuit who you hope to serve. A research report brings together your market, potential customers, competitors, pricing, positioning and a first-week plan.</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-3">Research suggests what to try. Real interviews, commitments and measured results tell you whether it works. Use the six workflows to keep that evidence together.</p>
      </div>
    </div>
    <ul className={styles.workflows}>
      {WORKFLOWS.map(([title, body]) => <li key={title}>
        <h3>{title}</h3><p>{body}</p>
      </li>)}
    </ul>
  </section>;
}

export function Questions() {
  const answers = [
    ["Do I need to know startup terminology?", "No. Start with a plain-language description of your business. Reading controls explain terms and let you switch between a guided view and more detail."],
    ["Does research prove that people will buy?", "No. Reports link available sources and highlight assumptions and limitations. Customer conversations, actual commitments and measured outcomes provide stronger evidence."],
    ["Will Pursuit contact people automatically?", "Every external action needs your approval. Real outreach also needs a connected Fo account and the required permissions. Simulated actions are labelled and never send anything."],
    ["Where should I start?", "Read the public sample without an account, then enter your website to create your first report. Experiment workflows come after the research. Research depends on provider availability."],
    ["Will it remember what I tested?", "Save learning on your report and track its recommended experiments. Follow-up answers use saved observations and results. Refreshes can include that context while preserving earlier report versions."],
    ["Can I take the research with me?", "Download reports as PDFs or Markdown files you can import into Notion. Exports retain source receipts and uncertainty labels. Public share links open without an account."],
  ];
  return <section aria-labelledby="questions-h" className={`${styles.section} ${styles.questions}`}>
    <h2 id="questions-h">Before you start</h2>
    <div>
    {answers.map(([q, a]) => <details key={q} className="group border-t border-line py-5">
      <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{a}</p>
    </details>)}
    </div>
  </section>;
}
