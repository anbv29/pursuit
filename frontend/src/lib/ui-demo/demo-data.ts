/**
 * Static content for the marketing page's illustrative demo.
 * Everything here is a fictional example and is labelled "Example" in the UI.
 * It is never sent to or read from the backend.
 */

export const HERO_REQUEST = "Practice managers at independent clinics who still reconcile insurance claims by hand";

export const HERO_STEPS = [
  { label: "Reading your website", done: "Read your website" },
  { label: "Researching the market and competitors", done: "Researched the market and competitors" },
  { label: "Ranking who fits best", done: "Ranked who fits best" },
  { label: "Drafting outreach in your voice", done: "Drafted outreach in your voice" },
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
    title: "Say who you want to meet",
    body: "Enter your website and, in your own words, who you want to reach and what you want to learn. One sentence is enough to start.",
    points: ["Your website, read directly", "Your own description of the buyer", "Optional context: stage, pricing, competitors"],
  },
  {
    id: "research",
    tab: "Research",
    title: "Pursuit researches and explains the fit",
    body: "It reads public sources, maps segments and competitors, and explains why each segment fits. Every claim is labelled as a sourced fact, an interpretation or an assumption.",
    points: ["Citations you can click and check", "Unsourced claims are flagged, not hidden", "Competitors, pricing and positioning gaps"],
  },
  {
    id: "reach",
    tab: "Reach out",
    title: "Drafts in your voice, sent only with your approval",
    body: "Pursuit drafts messages and interview invites. Nothing leaves your account until you review the exact recipient and wording and approve it.",
    points: ["One recipient per action", "Approve, edit or reject every send", "Simulated runs are always labelled"],
  },
  {
    id: "learn",
    tab: "Book and learn",
    title: "Book the call, then let the evidence decide",
    body: "Approved invites go out through Fo to book the conversation. Outcomes feed experiments that tell you plainly whether to continue, iterate, pivot or stop.",
    points: ["Interview booking through Fo", "Success criteria set before results", "Honest recommendations with their limits"],
  },
];

export const TRUST_POINTS = [
  { title: "Every claim shows its source", body: "Click through to the page it came from." },
  { title: "Nothing is sent without you", body: "Each outreach action waits for your approval." },
  { title: "Demo data is always labelled", body: "Simulated results never mix with real ones." },
  { title: "Your workspace stays yours", body: "Export everything, or delete it, any time." },
];

/** Mirrors the public plan catalogue (backend/app/services/plans.py). */
export const PRICING = {
  name: "Founder",
  price: "$29",
  interval: "per month",
  features: ["3 company reports a month", "50 report questions a month", "Experiments, approvals and Fo outreach", "Export or delete your data any time"],
  alternatives: "Try a single report for $15, or explore free with a sample report. Teams of up to five: $79 a month.",
};
