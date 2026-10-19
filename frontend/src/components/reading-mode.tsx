"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const KEY = "pursuit.readingMode";
let sessionMode = false;
const subscribe = (update: () => void) => {
  window.addEventListener(KEY, update);
  window.addEventListener("storage", update);
  return () => { window.removeEventListener(KEY, update); window.removeEventListener("storage", update); };
};
const read = () => {
  try { return localStorage.getItem(KEY) === "advanced"; } catch { return sessionMode; }
};
const Mode = createContext(false);
export const useAdvanced = () => useContext(Mode);

export const TERMS = [
  ["GTM (go-to-market)", "Your plan for reaching customers and turning their interest into sales."],
  ["ICP (ideal customer profile)", "The kind of customer most likely to need, buy and benefit from your product."],
  ["Segment", "A group of customers who share similar needs, jobs or company characteristics."],
  ["Persona", "A description of the person you sell to: their role, goals and concerns."],
  ["Positioning", "How you explain who your product helps and why they should choose it."],
  ["Hypothesis", "A belief you can test, such as: clinics will pay to save five hours a week."],
  ["Success criterion", "A measurable result you decide on before a test, so you know whether it worked."],
  ["Funnel / conversion", "The steps from finding your product to buying it. Conversion is the share who move to the next step."],
  ["Sample size (n)", "How many people or events a result is based on. A larger sample is usually more dependable."],
  ["95% confidence interval", "A range showing sampling uncertainty around a measured rate. It does not account for biased data."],
  ["Willingness to pay / LOI", "Whether customers will spend money. An LOI is a letter of intent; interest alone is weaker than payment."],
  ["Counterevidence", "Information that challenges your idea. Use it to spot what needs to change."],
  ["Pivot / iterate", "Pivot means change direction; iterate means improve the current approach and test again."],
];

export function ReadingProvider({ children }: { children: ReactNode }) {
  const advanced = useSyncExternalStore(subscribe, read, () => false);
  return <Mode.Provider value={advanced}>{children}</Mode.Provider>;
}

export function ReadingControls() {
  const advanced = useAdvanced();
  const set = (value: string) => {
    sessionMode = value === "advanced";
    try { localStorage.setItem(KEY, value); } catch { /* Use the session preference if storage is blocked. */ }
    window.dispatchEvent(new Event(KEY));
  };
  return (
    <div className="mx-auto mb-7 flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-4 print:hidden">
      <div>
        <p className="text-sm font-semibold text-ink">{advanced ? "Advanced view" : "Guided view"}</p>
        <p className="text-xs text-ink-3">{advanced ? "Industry labels with the full evidence and measurements." : "Plain-language labels and explanations. All evidence and measurements stay available."}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-ink-2">Reading style
          <select aria-label="Reading style" value={advanced ? "advanced" : "guided"} onChange={(e) => set(e.target.value)}
            className="ml-2 h-8 rounded-lg border border-line bg-surface px-2 text-sm text-ink">
            <option value="guided">Guided</option><option value="advanced">Advanced</option>
          </select>
        </label>
      </div>
      <details className="basis-full text-sm">
        <summary className="w-fit cursor-pointer text-[13px] font-semibold text-trail">Startup terms, explained</summary>
        <dl className="mt-3 grid gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
          {TERMS.map(([term, meaning]) => <div key={term}><dt className="font-medium">{term}</dt><dd className="mt-1 text-xs leading-relaxed text-ink-2">{meaning}</dd></div>)}
        </dl>
      </details>
    </div>
  );
}

export const SIMPLE_LABELS: Record<string, string> = {
  "Observed pricing": "Prices we found", "Offering": "What you sell", "Business model": "How you earn money",
  "Pains": "Problems they face", "Objections": "Reasons they might say no", "Market benchmarks": "Prices other companies charge",
  "Differentiators to lead with": "Reasons to choose you", "Pricing hypotheses": "Pricing ideas to test",
  "In-market signals": "Clues someone may be ready to buy", "Channels": "Where to reach customers",
  "Evidence for": "What supports this idea", "Evidence against": "What challenges this idea",
};

export const SECTION_HELP: Record<string, [string, string]> = {
  summary: ["Your report at a glance", "Start with the main findings and the first step worth taking."],
  snapshot: ["", "What the company sells, how it earns money, and what public sources tell us."],
  segments: ["Customers to focus on", "Groups most likely to benefit from your product. Fit scores are AI judgments, not measured sales results."],
  personas: ["People you need to reach", "The buyers' roles, goals, concerns, and places you may find them."],
  problems: ["Customer problems to check", "Ideas about what customers need. Conversations and real behavior can confirm or challenge them."],
  competitors: ["Other options customers could choose", "Compare alternatives, including their prices and limitations. Missing information stays unknown."],
  positioning: ["Why customers should choose you", "How to explain your value and what makes your product different."],
  pricing: ["What customers might pay", "Compare public prices and test your own. A suggested price is not proof that someone will pay it."],
  messaging: ["Messages to start a conversation", "Draft emails for different customer groups. Review and adapt them before sending."],
  prospecting: ["Where to find potential customers", "Places to look and clues that someone might need your product now."],
  funnel: ["Where people might drop out", "Possible reasons people stop between discovering your product and paying. These need real data to check."],
  experiments: ["Small tests to run next", "Each test checks one belief. Track one to save evidence, set a goal, and record what happens."],
  risks: ["What is still uncertain", "Gaps and risks to investigate before committing more time or money."],
  sources: ["Sources you can check", "Open the original pages to check dates, context, and whether they support a claim."],
};
