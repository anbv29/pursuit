"""Funnel CSV parsing and deterministic stage analysis."""

import csv
import io
from dataclasses import dataclass, field

from app.services.stats import wilson

MAX_CSV_BYTES = 100_000
MAX_STAGES = 12


@dataclass
class ParseResult:
    stages: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def parse_csv(raw: bytes) -> ParseResult:
    """Expect a header row with `stage,count`; one row per funnel stage, top to bottom."""
    out = ParseResult()
    if len(raw) > MAX_CSV_BYTES:
        out.errors.append("File is larger than 100 KB.")
        return out
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        out.errors.append("File must be UTF-8 encoded CSV.")
        return out
    reader = csv.DictReader(io.StringIO(text))
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]
    if headers[:2] != ["stage", "count"]:
        out.errors.append("First row must be the header: stage,count")
        return out
    for i, row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        name, count = row.get("stage", ""), row.get("count", "")
        if not name and not count:
            continue
        if not name or len(name) > 60:
            out.errors.append(f"Row {i}: stage name is required (max 60 characters).")
            continue
        if name[0] in "=+-@":
            out.errors.append(f"Row {i}: stage name can't start with '{name[0]}'.")
            continue
        try:
            n = int(count.replace(",", ""))
            if n < 0:
                raise ValueError
        except ValueError:
            out.errors.append(f"Row {i}: count '{count[:20]}' must be a whole number ≥ 0.")
            continue
        out.stages.append({"name": name, "count": n})
    validate(out)
    return out


def validate(out: ParseResult) -> None:
    if len(out.stages) < 2 and not out.errors:
        out.errors.append("A funnel needs at least two stages.")
    if len(out.stages) > MAX_STAGES:
        out.errors.append(f"At most {MAX_STAGES} stages are supported.")
    names = [s["name"].lower() for s in out.stages]
    if len(set(names)) != len(names):
        out.errors.append("Stage names must be unique.")
    for prev, cur in zip(out.stages, out.stages[1:], strict=False):
        if cur["count"] > prev["count"]:
            out.warnings.append(
                f"'{cur['name']}' ({cur['count']}) is larger than '{prev['name']}' ({prev['count']}). "
                "Check that stages are in order and from the same time window."
            )


def analyze(stages: list[dict]) -> dict:
    steps = []
    for prev, cur in zip(stages, stages[1:], strict=False):
        conv = wilson(min(cur["count"], prev["count"]), prev["count"])
        steps.append(
            {
                "from": prev["name"],
                "to": cur["name"],
                "conversion": conv.dict(),
                "drop_off": max(prev["count"] - cur["count"], 0),
            }
        )
    measurable = [s for s in steps if s["conversion"]["value"] is not None]
    bottleneck = min(measurable, key=lambda s: s["conversion"]["value"]) if measurable else None
    top, bottom = stages[0]["count"], stages[-1]["count"]
    return {
        "stages": stages,
        "steps": steps,
        "overall": wilson(min(bottom, top), top).dict(),
        "bottleneck": bottleneck,
        "explanations": explanations(bottleneck) if bottleneck else [],
    }


def explanations(step: dict) -> list[dict]:
    """Competing explanations for the worst step, each with a test that separates it."""
    a, b = step["from"], step["to"]
    return [
        {
            "explanation": f"Wrong people are entering '{a}' (targeting/ICP mismatch).",
            "test": f"Split '{a}' by source or persona and compare '{a}'→'{b}' conversion per segment.",
        },
        {
            "explanation": f"Friction in the step from '{a}' to '{b}' (UX, setup effort, unclear next step).",
            "test": "Watch 5 users attempt the step or run a simplified-flow variant for one cohort.",
        },
        {
            "explanation": f"Value isn't clear enough at '{a}' to justify moving on.",
            "test": f"Interview 5 people who stalled at '{a}' about what they expected next.",
        },
        {
            "explanation": "Measurement issue: events are missing or stages use different time windows.",
            "test": "Reconcile counts for one week against raw records before changing the product.",
        },
    ]
