import json
import re
from collections.abc import Iterator
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlsplit
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

FONT = TTFont("ReportExport", Path(__file__).with_name("report_export_fonts") / "DejaVuSans.ttf")
pdfmetrics.registerFont(FONT)

NOTICE = (
    "AI research from accessible public pages and supplied URLs. Public statements are not "
    "independently verified. Facts, interpretations, assumptions and confidence labels describe "
    "the saved evidence, not proven outcomes. Quotes establish provenance, not truth or causality."
)


@dataclass(frozen=True)
class Heading:
    text: str
    level: int


@dataclass(frozen=True)
class Value:
    label: str
    text: str


def _walk(value: dict | list, level: int = 2) -> Iterator[Heading | Value]:
    items = value.items() if isinstance(value, dict) else enumerate(value, 1)
    for key, item in items:
        label = str(key).replace("_", " ") if isinstance(value, dict) else f"Item {key}"
        if isinstance(item, (dict, list)) and item:
            yield Heading(label, level)
            yield from _walk(item, level + 1)
        else:
            yield Value(label, item if isinstance(item, str) else json.dumps(item, ensure_ascii=False))


def _markdown_text(value: str) -> str:
    return re.sub(r"([\\`*_{}\[\]<>()#+.!|>~-])", r"\\\1", value).replace("\n", "  \n")


def _url(value: str) -> str | None:
    if not value.startswith(("https://", "http://")):
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    return value if parsed.scheme in {"https", "http"} and parsed.netloc and not any(
        char.isspace() for char in value
    ) else None


def markdown(document: dict) -> bytes:
    lines = ["# Company research report", "", NOTICE, ""]
    for block in _walk(document):
        if isinstance(block, Heading):
            lines.extend([f"{'#' * min(block.level, 6)} {_markdown_text(block.text)}", ""])
        else:
            text = _markdown_text(block.text)
            if _url(block.text):
                text = f"[{text}]({quote(block.text, safe=':/?#@!$&\'*,;=+%~.-_')})"
            lines.extend([f"**{_markdown_text(block.label)}**: {text}", ""])
    return ("\n".join(lines).rstrip() + "\n").encode("utf-8")


def filename(document: dict, extension: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9]+", "-", document.get("company_name", "")).strip("-")[:80]
    return f"pursuit-{name or 'report'}.{extension}"


def _pdf_text(value: str) -> str:
    value = "".join(
        char if char == "\n" or ord(char) in FONT.face.charToGlyph
        else char.encode("unicode_escape").decode("ascii")
        for char in value
    )
    return escape(value).replace("\n", "<br/>")


def pdf(document: dict) -> bytes:
    output = BytesIO()
    body = ParagraphStyle("body", fontName=FONT.fontName, fontSize=9, leading=13, spaceAfter=5)
    heading = ParagraphStyle(
        "heading", parent=body, fontSize=13, leading=17, spaceBefore=10, keepWithNext=True,
        textColor=HexColor("#174c39"),
    )
    title = ParagraphStyle("title", parent=heading, fontSize=22, leading=28, spaceAfter=12)
    story = [Paragraph("Company research report", title), Paragraph(NOTICE, body),
             Paragraph("Characters outside the embedded font are preserved as Unicode escapes. "
                       "The Markdown download retains all original Unicode text.", body), Spacer(1, 12)]
    for block in _walk(document):
        if isinstance(block, Heading):
            story.append(Paragraph(_pdf_text(block.text), heading))
        else:
            text = _pdf_text(block.text)
            if _url(block.text):
                text = f'<link href={quoteattr(quote(block.text, safe=":/?#@!$&()*+,;=~%._-"))}>{text}</link>'
            story.append(Paragraph(f"{_pdf_text(block.label)}: {text}", body))

    def footer(canvas, doc):
        canvas.setFont(FONT.fontName, 8)
        canvas.drawRightString(A4[0] - 42, 25, f"Pursuit | {doc.page}")

    SimpleDocTemplate(
        output, pagesize=A4, rightMargin=42, leftMargin=42, topMargin=40, bottomMargin=42,
        title="Company research report", author="Pursuit",
    ).build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
