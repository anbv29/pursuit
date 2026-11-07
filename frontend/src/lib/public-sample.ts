import type { Claim, ReportSource } from "./types";

const checked = "2026-11-07";
export const publicSample = {
  company: "Cal.com",
  title: "Where team scheduling earns its upgrade",
  checked,
  scope: "An editorial research brief using public product information. Not commissioned by Cal.com. No customer interviews or private company data.",
  sources: [{
    id: "S1", title: "Cal.com pricing and plan comparison", url: "https://cal.com/pricing",
    via: "Public primary source", retrieved_at: checked, source_role: "company",
    retrieval_status: "retrieved",
    excerpt: "For collaborative features, choose one of our premium plans that fits your company size.",
  }] satisfies ReportSource[],
  facts: [
    { text: "Cal.com offers a free individual scheduling plan.", kind: "fact", confidence: "high", source_ids: ["S1"] },
    { text: "Its team plan adds shared availability, round-robin scheduling and routing forms.", kind: "fact", confidence: "high", source_ids: ["S1"] },
    { text: "Larger organization plans add SAML SSO, SCIM and role-based permissions.", kind: "fact", confidence: "high", source_ids: ["S1"] },
  ] satisfies Claim[],
  interpretations: [
    { text: "The upgrade story appears to move from individual convenience to team coordination, then governance.", kind: "interpretation", confidence: "medium", source_ids: ["S1"] },
  ] satisfies Claim[],
  hypotheses: [
    { text: "Small sales teams losing meetings during handoffs may be a useful segment to interview first.", kind: "assumption", confidence: "low", source_ids: [] },
  ] satisfies Claim[],
  unknowns: [
    "Published features do not prove adoption, revenue, conversion or customer satisfaction.",
    "We have not verified how often handoff problems happen or whether teams will pay to solve them.",
    "This brief uses one vendor source, with no independent customer corroboration. Product details may change after the review date.",
  ],
  nextTest: {
    title: "Interview five small sales teams",
    action: "Ask each team to reconstruct its last missed or misrouted meeting. Record the current workaround, frequency, cost and purchasing owner.",
    decision: "Research criterion, not an observed result. Continue exploring this segment if at least three teams describe a recent incident and an active workaround. Otherwise revisit the segment.",
    counterevidence: "Teams already coordinate reliably, or missed meetings have little practical cost.",
  },
};

