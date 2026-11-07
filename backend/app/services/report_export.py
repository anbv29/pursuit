import json
import re
from collections.abc import Iterator
from dataclasses import dataclass
from urllib.parse import quote, urlsplit

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
