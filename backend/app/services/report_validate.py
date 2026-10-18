"""Server-side checks on a generated report. Pure functions, unit-tested.

- source ids must exist in the list of URLs actually retrieved
- a "fact" with no valid source is downgraded to an unsourced interpretation
- experiment metrics must be real Pursuit metrics; targets are clamped to sane ranges
- list lengths are capped so a runaway response can't bloat the database
"""

from app.schemas.report import ReportContent
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


def _claim(c: dict, valid: set[str], stats: dict) -> dict:
    ids = [i for i in c.get("source_ids", []) if i in valid]
    stats["dropped_source_refs"] += len(c.get("source_ids", [])) - len(ids)
    c["source_ids"] = ids
    if c.get("kind") == "fact" and not ids:
        c["kind"] = "interpretation"
        c["confidence"] = "low"
        c["unsourced"] = True
        stats["downgraded_facts"] += 1
    return c


def _walk(node, valid: set[str], stats: dict):
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


def validate(content: ReportContent, sources: list[dict]) -> tuple[dict, dict]:
    valid = {s["id"] for s in sources}
    stats = {"dropped_source_refs": 0, "downgraded_facts": 0, "fixed_metrics": 0}
    data = _walk(content.model_dump(mode="json"), valid, stats)
    for comp in data["competitors"]:
        kept = [i for i in comp["source_ids"] if i in valid]
        stats["dropped_source_refs"] += len(comp["source_ids"]) - len(kept)
        comp["source_ids"] = kept
        comp["unsourced"] = not kept
    for seg in data["segments"]:
        seg["fit_score"] = min(max(int(seg["fit_score"]), 1), 5)
    data["experiments"] = [_experiment(e, stats) for e in data["experiments"]]
    data["validation"] = stats
    return data, stats
