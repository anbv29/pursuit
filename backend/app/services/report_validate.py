"""Server-side checks on a generated report. Pure functions, unit-tested.

- source ids must exist in the list of URLs actually retrieved
- a "fact" with no valid source is downgraded to an unsourced interpretation
- experiment metrics must be real Pursuit metrics; targets are clamped to sane ranges
- list lengths are capped so a runaway response can't bloat the database
"""

from app.schemas.gtm import GTMConstraints
from app.schemas.report import ReportContent
from app.services.evidence_checks import measurement_matches, numeric_support, quote_matches
from app.services.report_research import ALLOWED_METRICS
from app.services.use_cases import TEMPLATES

RATE_METRICS = {
    "problem_confirmed_rate",
    "strong_pain_rate",
    "budget_owner_identified_rate",
    "positive_reply_rate",
    "worst_stage_conversion",
}
CAP = 12


def _claim(c: dict, valid: dict, stats: dict) -> dict:
    ids = [i for i in c.get("source_ids", []) if i in valid]
    stats["dropped_source_refs"] += len(c.get("source_ids", [])) - len(ids)
    c["source_ids"] = ids

    quote = c.get("supporting_quote", "")
    matching = [i for i in ids if quote_matches(quote, valid[i])]
    kept = matching
    if c.get("kind") == "fact" and not numeric_support(c["text"], quote):
        kept = []
    stats["dropped_source_refs"] += len(ids) - len(kept)
    c["source_ids"] = kept
    if not kept:
        c["supporting_quote"] = ""
        c["confidence"] = "low"
    if c.get("kind") == "assumption":
        c["confidence"] = "low"
    elif c.get("kind") == "interpretation" and c["confidence"] == "high":
        c["confidence"] = "medium" if kept else "low"
    if c.get("kind") == "fact" and not c["source_ids"]:
        c["kind"] = "interpretation"
        c["confidence"] = "low"
        c["unsourced"] = True
        c["validation_note"] = "The quotation or numeric assertion could not be verified."
        stats["downgraded_facts"] += 1
    return c


def _walk(node, valid: dict, stats: dict):
    """Apply claim checks to every Claim-shaped dict anywhere in the tree."""
    if isinstance(node, dict):
        if {"text", "kind", "source_ids"} <= node.keys():
            return _claim(node, valid, stats)
        return {k: _walk(v, valid, stats) for k, v in node.items()}
    if isinstance(node, list):
        return [_walk(v, valid, stats) for v in node[:CAP]]
    return node


def _experiment(e: dict, stats: dict) -> dict:
    if e["metric"] not in ALLOWED_METRICS:
        default = TEMPLATES[e["use_case"]]["default_criteria"][0]
        e.update(metric=default["metric"], comparator=default["comparator"], target=default["target"])
        stats["fixed_metrics"] += 1
    if e["metric"] in RATE_METRICS:
        target = e["target"] / 100 if e["target"] > 1 else e["target"]  # "40" meaning 40%
        e["target"] = min(max(target, 0.0), 1.0)
    else:
        e["target"] = min(max(e["target"], 0.0), 10_000.0)
    e["min_sample"] = min(max(int(e["min_sample"]), 0), 10_000)
    return e


def _resources(strategy: dict, constraints: dict | None) -> dict:
    limits = GTMConstraints.model_validate(constraints or {})
    changes = []
    for field, limit, label in (
        ("monthly_budget", limits.monthly_budget, "monthly budget"),
        ("weekly_hours", limits.weekly_hours, "total team hours per week"),
    ):
        total = sum(c[field] for c in strategy["channels"])
        if limit is not None and total > limit:
            for channel in strategy["channels"]:
                channel[field] = int(channel[field] * limit / total * 100) / 100
            changes.append(
                f"Reduced channel allocations to your {label}. Review the actions before committing."
            )
    for phase in strategy["launch_plan"]:
        start = min(phase["start_day"], limits.horizon_days)
        end = min(max(start, phase["end_day"]), limits.horizon_days)
        if (start, end) != (phase["start_day"], phase["end_day"]):
            changes.append("Adjusted a phase to your planning horizon. Review its scope and decision gate.")
        phase.update(start_day=start, end_day=end)
    strategy["launch_plan"].sort(key=lambda p: (p["start_day"], p["end_day"]))
    strategy.update(
        budget_currency=limits.currency,
        constraints=limits.model_dump(),
        resource_adjustments=list(dict.fromkeys(changes)),
    )
    return strategy


def validate(
    content: ReportContent, sources: list[dict], *, gtm_constraints: dict | None = None
) -> tuple[dict, dict]:
    valid = {s["id"]: s for s in sources}
    stats = {"dropped_source_refs": 0, "downgraded_facts": 0, "fixed_metrics": 0, "dropped_measurements": 0}
    data = _walk(content.model_dump(mode="json"), valid, stats)
    for comp in data["competitors"]:
        kept = [i for i in comp["source_ids"] if i in valid]
        stats["dropped_source_refs"] += len(comp["source_ids"]) - len(kept)
        comp["source_ids"] = kept
        comp["unsourced"] = not kept
        pricing_claim = comp.get("pricing_evidence")
        if not pricing_claim or pricing_claim.get("kind") != "fact":
            comp["pricing"] = "Not verified in retrieved sources."
        else:
            comp["pricing"] = pricing_claim["text"]
    for seg in data["segments"]:
        seg["fit_score"] = min(max(int(seg["fit_score"]), 1), 5)
    data["experiments"] = [_experiment(e, stats) for e in data["experiments"]]
    measurements = []
    for point in data["measurements"]:
        source = valid.get(point["source_id"])
        if source and measurement_matches(point, source):
            measurements.append(point)
        else:
            stats["dropped_measurements"] += 1
    data["measurements"] = measurements
    if data["gtm_strategy"]:
        data["gtm_strategy"] = _resources(data["gtm_strategy"], gtm_constraints)
    data["validation"] = stats
    return data, stats
