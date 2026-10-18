from app.models.enums import STAGE_ORDER, Stage


def test_stage_order_is_the_documented_lifecycle():
    assert [s.value for s in STAGE_ORDER] == [
        "hypothesis",
        "research",
        "evidence",
        "design",
        "approval",
        "action",
        "outcomes",
        "analysis",
        "recommendation",
    ]
    assert STAGE_ORDER[0] is Stage.HYPOTHESIS
