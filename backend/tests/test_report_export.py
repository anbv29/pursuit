from copy import deepcopy
from io import BytesIO

import pytest
from pypdf import PdfReader

from app.services import report_export

pytestmark = pytest.mark.no_database


def document():
    return {
        "company_name": "Café Δοκιμή",
        "content": {
            "key_facts": [
                {
                    "text": "Costs ₹49",
                    "kind": "interpretation",
                    "confidence": "low",
                    "source_ids": ["S1", "S2", "S3", "S4", "S5"],
                    "unsourced": True,
                    "validation_note": "The numeric assertion could not be verified.",
                    "supporting_quote": "Original — quotation",
                }
            ],
            "future_extra": {"nested": [False, 0, None, [], {}, {"unknown": "Still uncertain"}]},
        },
        "sources": [
            {
                "id": "S5",
                "url": "https://example.com/a_(b)?a=1&b=2",
                "retrieved_at": "2026-11-07T00:00:00Z",
                "excerpt": "Exact receipt",
                "future_extra": {"quality_note": "source extra marker"},
            }
        ],
    }


def test_markdown_keeps_unicode_provenance_and_nested_extras():
    saved = document()
    before = deepcopy(saved)
    text = report_export.markdown(saved).decode("utf-8")
    for expected in [
        "Café Δοκιμή",
        "₹49",
        "Original — quotation",
        "interpretation",
        "low",
        "S5",
        "numeric assertion",
        "Still uncertain",
        "false",
        "null",
        "2026",
        "Exact receipt",
    ]:
        assert expected in text
    assert "https://example.com/a_%28b%29?a=1&b=2" in text
    assert "future extra" in text and "nested" in text
    assert "Source reference index" in text and "**S5**:" in text
    assert saved == before


def test_markdown_escapes_untrusted_markup_and_preserves_line_breaks():
    text = report_export.markdown({"note": "<script>alert(1)</script>\n# heading [link](javascript:x)"})
    assert b"<script>" not in text
    assert b"  \n\\# heading" in text
    assert b"http://" in report_export.markdown({"note": "http://[broken"})


def test_download_filename_cannot_inject_headers_or_paths():
    assert report_export.filename({"company_name": '../Acme\r\n"oops'}, "md") == "pursuit-Acme-oops.md"
    assert report_export.filename({"company_name": "東京"}, "pdf") == "pursuit-report.pdf"


def test_pdf_is_readable_with_embedded_unicode_and_all_provenance():
    saved = document()
    before = deepcopy(saved)
    data = report_export.pdf(saved)
    assert data.startswith(b"%PDF-")
    reader = PdfReader(BytesIO(data))
    text = "\n".join(page.extract_text() for page in reader.pages)
    for expected in [
        "Café Δοκιμή",
        "₹49",
        "Original — quotation",
        "interpretation",
        "low",
        "S5",
        "numeric assertion",
        "Still uncertain",
        "false",
        "null",
        "Exact receipt",
    ]:
        assert expected in text
    assert "https://example.com/a_(b)?a=1&b=2" in text
    assert "Source reference index" in text and "S5: https://example.com/" in text
    fonts = [font.get_object() for page in reader.pages for font in page["/Resources"]["/Font"].values()]
    assert any("/FontFile2" in font.get("/FontDescriptor", {}) for font in fonts)
    assert saved == before


def test_pdf_keeps_long_text_markup_and_unsupported_characters():
    data = report_export.pdf({"extra": "<b>literal</b> & uncertainty\n東京\x00", "long": "z" * 10000})
    reader = PdfReader(BytesIO(data))
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert "<b>literal</b> & uncertainty" in text
    assert r"\u6771\u4eac\x00" in text
    assert text.count("z") == 10000
    assert len(reader.pages) > 1
