"""Small, deterministic statistics helpers. No model arithmetic anywhere."""

import math
from dataclasses import asdict, dataclass

Z95 = 1.959964


@dataclass
class Rate:
    numerator: int
    denominator: int
    value: float | None
    ci_low: float | None
    ci_high: float | None

    def dict(self) -> dict:
        return asdict(self)


def wilson(successes: int, n: int) -> Rate:
    """Proportion with a 95% Wilson score interval (behaves well at small n)."""
    if n <= 0:
        return Rate(successes, n, None, None, None)
    p = successes / n
    denom = 1 + Z95**2 / n
    centre = (p + Z95**2 / (2 * n)) / denom
    half = Z95 * math.sqrt(p * (1 - p) / n + Z95**2 / (4 * n * n)) / denom
    return Rate(
        successes, n, round(p, 4), round(max(0.0, centre - half), 4), round(min(1.0, centre + half), 4)
    )


def compare(a: Rate, b: Rate, min_sample: int) -> str:
    """Plain-language, conservative comparison of two rates.

    Non-overlapping 95% intervals is a deliberately strict bar; we never call a
    difference 'significant' — only 'clear' or 'not distinguishable yet'.
    """
    if a.denominator < min_sample or b.denominator < min_sample:
        return "insufficient_sample"
    if a.ci_low is None or b.ci_low is None:
        return "insufficient_sample"
    if a.ci_low > b.ci_high or b.ci_low > a.ci_high:
        return "clear_difference"
    return "not_distinguishable"


def evaluate(comparator: str, value: float | None, target: float) -> bool | None:
    if value is None:
        return None
    return {
        ">=": value >= target,
        "<=": value <= target,
        ">": value > target,
        "<": value < target,
    }[comparator]
