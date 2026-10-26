import re
import unicodedata


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).translate(str.maketrans({"−": "-", "–": "-", "—": "-"}))
    return re.sub(r"\s+", " ", text).strip().casefold()


def numbers(text: str) -> set[str]:
    return {m.replace(",", "") for m in re.findall(r"(?<!\w)[+-]?\d[\d,]*(?:\.\d+)?", normalize(text))}


def quote_matches(quote: str, source: dict) -> bool:
    quoted = normalize(quote)
    return (
        source.get("retrieval_status") != "unavailable"
        and len(quoted) >= 12
        and quoted in normalize(source.get("excerpt", ""))
    )


def numeric_support(text: str, quote: str) -> bool:
    if not numbers(text):
        return True
    return numbers(text) <= numbers(quote) and normalize(text) in normalize(quote)


def measurement_matches(point: dict, source: dict) -> bool:
    quote = normalize(point["quote"])
    value = normalize(point["value"])
    expected = numbers(value) | numbers(point["period"]) | numbers(point["scope"])
    if (
        not quote_matches(point["quote"], source)
        or value not in quote
        or not numbers(value)
        or not numbers(value) <= numbers(quote)
        or not numbers(quote) <= expected
    ):
        return False
    unit_text = normalize(point["unit"])
    for symbol, name in (("$", "usd"), ("€", "eur"), ("£", "gbp"), ("₹", "inr"), ("%", "percent")):
        quote = quote.replace(symbol, f" {name} ")
        unit_text = unit_text.replace(symbol, f" {name} ")
    unit_words = set(re.findall(r"\w+", unit_text))
    quote_words = set(re.findall(r"\w+", quote))
    if not unit_words <= quote_words:
        return False
    numerical_units = {
        "usd",
        "eur",
        "gbp",
        "inr",
        "percent",
        "million",
        "billion",
        "thousand",
        "trillion",
        "year",
        "month",
        "week",
        "day",
        "hour",
        "minute",
        "second",
    }
    if (unit_words & numerical_units) != (quote_words & numerical_units):
        return False
    if point["scope"] and normalize(point["scope"]) not in quote:
        return False
    period = normalize(point["period"])
    return period in ("", "not stated", "unknown") or period in quote
