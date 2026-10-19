/**
 * Static content for the marketing page's illustrative demo.
 * Everything here is a fictional example and is labelled "Example" in the UI.
 * It is never sent to or read from the backend.
 */

export const HERO_REQUEST = "We help independent clinics reconcile insurance claims. Who should we target first, and what should we test?";

export const HERO_STEPS = [
  { label: "Reading your website", done: "Read your website" },
  { label: "Researching the market and competitors", done: "Researched the market and competitors" },
  { label: "Ranking who fits best", done: "Ranked who fits best" },
  { label: "Designing the next experiment", done: "Suggested an experiment to track" },
];

export const HERO_SOURCES = 38;

export const HERO_MATCHES = [
  {
    who: "Practice manager",
    where: "Independent outpatient clinics, 5–30 staff",
    fit: 5,
    why: "Owns claim follow-up personally and reports spending an afternoon a week matching remittances.",
  },
  {
    who: "Billing lead",
    where: "Multi-payer physiotherapy groups",
    fit: 4,
    why: "Juggles several payer portals; denied claims are the most visible pain in public job posts.",
  },
];

export const HERO_DRAFT = {
  subject: "15 minutes on claim reconciliation?",
  body: "Hi Dana, I'm researching how small clinics reconcile insurance payments. Would you share how your team handles it today? No pitch, just learning.",
};

export const HOW_IT_WORKS = [
  {
    id: "describe",
    tab: "Describe",
    title: "Describe your business and your biggest question",
    body: "Enter your website, what you offer and who you hope to help. Add the question you need to answer before investing more time or money.",
    points: ["Your website, read directly", "Your own description of the buyer", "Optional context: stage, pricing, competitors"],
  },
  {
    id: "research",
    tab: "Research",
    title: "Pursuit researches and explains the fit",
    body: "With AI research configured and a research credit, build a report covering customer groups, buyer profiles, problems, competitors, positioning, pricing, messaging and suggested experiments. Facts, interpretations and assumptions are labelled separately.",
    points: ["Citations you can click and check", "Unsourced claims are flagged, not hidden", "Competitors, pricing and positioning gaps"],
  },
  {
    id: "reach",
    tab: "Test",
    title: "Turn the findings into a test you can measure",
    body: "Choose a suggested experiment or design your own. Define the customer group, question and success criteria, then collect evidence, interview notes or funnel data. Optional external actions require a supported integration and explicit approval.",
    points: ["Six reusable experiment workflows", "Compare messages or import funnel CSVs", "Review every external action before approval"],
  },
  {
    id: "learn",
    tab: "Learn",
    title: "Record what happened and decide what comes next",
    body: "Capture actual outcomes and review the evidence for continuing, improving, changing direction or stopping. When there is not enough evidence, Pursuit says the result is inconclusive. A suggested action is never proof of a booked meeting or a sale.",
    points: ["Persisted evidence and experiment history", "Confidence, contradictions and limitations", "A first-week checklist and next recommended action"],
  },
];

export const TRUST_POINTS = [
  { title: "Check the evidence", body: "Sources are linked; unsupported claims are flagged." },
  { title: "Nothing is sent without you", body: "Each outreach action waits for your approval." },
  { title: "Demo data is always labelled", body: "Simulated results never mix with real ones." },
  { title: "Control your workspace", body: "Owner-only export and deletion, with billing safeguards." },
];
