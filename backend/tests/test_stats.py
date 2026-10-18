from app.services.stats import compare, evaluate, wilson


def test_wilson_known_values():
    r = wilson(10, 100)
    assert r.value == 0.1
    assert 0.054 < r.ci_low < 0.056 and 0.174 < r.ci_high < 0.176


def test_wilson_edge_cases():
    assert wilson(0, 0).value is None
    zero = wilson(0, 5)
    assert zero.value == 0 and zero.ci_low == 0 and zero.ci_high > 0.4  # wide at small n
    assert wilson(5, 5).ci_high == 1.0


def test_compare_is_conservative():
    assert compare(wilson(3, 10), wilson(1, 10), min_sample=30) == "insufficient_sample"
    assert compare(wilson(12, 100), wilson(9, 100), min_sample=30) == "not_distinguishable"
    assert compare(wilson(40, 100), wilson(5, 100), min_sample=30) == "clear_difference"


def test_evaluate():
    assert evaluate(">=", 0.5, 0.5) is True
    assert evaluate("<", 3, 2) is False
    assert evaluate(">=", None, 1) is None
