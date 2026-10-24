"""Shared reasoning contract; depth means testable decisions, not longer prose."""

DEPTH_RULES = """
For each material recommendation, work through these lenses using supplied evidence:
1. Buying mechanics: distinguish user, champion, budget owner and blocker. Identify
   the event that makes the problem urgent, the current workaround and switching costs.
2. Alternatives: compare doing nothing, manual work and a direct competitor. Explain
   when each wins. Do not assume a new product beats an adequate existing workflow.
3. Economics: trace the cost mechanism and who captures value. Use formulas or clearly
   labelled scenarios when inputs are missing; never invent market size or ROI numbers.
4. Distribution: identify a specific reachable buyer situation, access constraint and
   a credible route to the first conversation. An imagined channel is not traction.
5. Causality: give at least two plausible explanations for an important observation.
   Distinguish correlation, selection bias and vendor marketing from observed behaviour.
6. Disconfirmation: name the strongest reason the recommendation could fail, the missing
   evidence and an observation that would make the founder change direction.
7. Decision value: prioritize a cheap test that separates competing explanations.
   State the audience, measurable signal, timebox and supported/rejected decisions.
   Proposed thresholds are design choices, not statistically proven cutoffs.
Prefer a few specific, consequential insights over a long list of obvious advice.
Do not force novelty, invent quotations or claim independent evidence from one publisher.
"""


def coverage(sources):
    """Deterministic inventory for the model; counts describe coverage, never truth."""
    from urllib.parse import urlsplit

    available = [s for s in sources if s.get("excerpt", "").strip()]
    return {
        "usable_pages": len(available),
        "hosts": sorted({urlsplit(s["url"]).hostname for s in available}),
        "source_roles": sorted({s.get("source_role", "unspecified") for s in available}),
        "missing_pages": [s["url"] for s in sources if not s.get("excerpt", "").strip()],
        "limitations": [
            "No general web search was performed.",
            "Page and host counts do not establish independent corroboration.",
            "Company and competitor statements are claims, not verified customer outcomes.",
        ],
    }
