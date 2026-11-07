from copy import deepcopy

import pytest

from app.services import report_export

pytestmark = pytest.mark.no_database


def document():
    return {
        "company_name": "Café Δοκιμή",
        "content": {
            "key_facts": [{"text": "Costs ₹49", "kind": "interpretation", "confidence": "low",
                           "source_ids": ["S1", "S2", "S3", "S4", "S5"], "unsourced": True,
                           "validation_note": "The numeric assertion could not be verified.",
                           "supporting_quote": "Original — quotation"}],
            "future_extra": {"nested": [False, 0, None, [], {}, {"unknown": "Still uncertain"}]},
        },
        "sources": [{"id": "S5", "url": "https://example.com/a_(b)?a=1&b=2",
                     "retrieved_at": "2026-11-07T00:00:00Z", "excerpt": "Exact receipt"}],
    }


def test_markdown_keeps_unicode_provenance_and_nested_extras():
    saved = document()
    before = deepcopy(saved)
    text = report_export.markdown(saved).decode("utf-8")
    for expected in ["Café Δοκιμή", "₹49", "Original — quotation", "interpretation", "low", "S5",
                     "numeric assertion", "Still uncertain", "false", "null", "2026", "Exact receipt"]:
        assert expected in text
    assert "https://example.com/a_%28b%29?a=1&b=2" in text
    assert "future extra" in text and "nested" in text
    assert saved == before


def test_markdown_escapes_untrusted_markup_and_preserves_line_breaks():
    text = report_export.markdown({"note": "<script>alert(1)</script>\n# heading [link](javascript:x)"})
    assert b"<script>" not in text
    assert b"  \n\\# heading" in text
    assert b"http://" in report_export.markdown({"note": "http://[broken"})


def test_download_filename_cannot_inject_headers_or_paths():
    assert report_export.filename({"company_name": '../Acme\r\n"oops'}, "md") == "pursuit-Acme-oops.md"
    assert report_export.filename({"company_name": "東京"}, "pdf") == "pursuit-report.pdf"
