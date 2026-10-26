import json

import pytest
from pydantic import ValidationError

from app.schemas.report import PartGTM, PartMarket
from app.services import free_provider, report_research
from tests.test_gtm_strategy import strategy
from tests.test_report_validate import sample

pytestmark = pytest.mark.no_database


def test_invalid_strategy_does_not_discard_other_report_sections(monkeypatch):
    broken = strategy()
    broken["objective"] = "x" * 1001
    with pytest.raises(ValidationError):
        PartGTM.model_validate({"gtm_strategy": broken})
    monkeypatch.setattr(report_research, "_client", lambda: object())

    def generate(client, model, context, schema, instruction):
        if schema is PartGTM:
            return schema.model_validate({"gtm_strategy": broken}, context={"synthesis": True})
        return schema.model_validate(sample().model_dump())

    monkeypatch.setattr(report_research, "_synthesize_part", generate)
    result = report_research.synthesize("https://example.com", "", {}, report_research.Research("notes"))
    assert result.snapshot.name == "Acme"
    assert result.gtm_strategy is None


def test_transport_only_normalizes_opted_in_measurements(monkeypatch):
    from app.services import free_research

    measurement = dict(
        label="Price",
        value="49",
        unit="USD",
        scope="Pro",
        period="month",
        source_id="S1",
        quote="Pro costs $49 per month.",
        caveat="Vendor price",
    )
    payload = sample().model_dump()
    payload["measurements"] = [dict(measurement, quote="short"), *[measurement] * 14]
    monkeypatch.setattr(free_research, "_request", lambda *args: json.dumps(payload))
    monkeypatch.setattr(
        free_provider,
        "get_settings",
        lambda: type("Settings", (), {"ai_enabled": True, "free_research_model": "example:free"})(),
    )
    client = free_provider.Client()
    with pytest.raises(free_provider.APIError):
        client.parse(system="", messages=[], output_format=PartMarket)
    result = client.parse(
        system="", messages=[], output_format=PartMarket, validation_context={"synthesis": True}
    )
    assert len(result.parsed_output.measurements) == 12
    assert all(item.quote == measurement["quote"] for item in result.parsed_output.measurements)
