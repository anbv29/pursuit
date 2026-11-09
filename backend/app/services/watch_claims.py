import hashlib
import json
import re
from copy import deepcopy

MAX_CLAIMS = 5
MAX_SOURCES = 4
MAX_TEXT = 8000


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def normalize(text):
    return re.sub(r"\s+", " ", text).strip().casefold()


def claims_for(report):
    sources = {source["id"]: source for source in report.sources}
    claims = []

    def walk(node, path):
        if isinstance(node, dict):
            if {"text", "kind", "source_ids"} <= node.keys():
                receipts = [
                    {
                        key: source.get(key)
                        for key in ("id", "url", "title", "excerpt", "retrieved_at", "sha256")
                    }
                    for sid in node["source_ids"]
                    if (source := sources.get(sid)) and source.get("excerpt") and source.get("url")
                ]
                quote = node.get("supporting_quote", "")
                receipts = [r for r in receipts if quote and normalize(quote) in normalize(r["excerpt"])]
                if receipts:
                    claim = {
                        "id": ".".join(path),
                        "text": node["text"],
                        "section": path[0],
                        "source_ids": [r["id"] for r in receipts],
                        "quote": quote,
                        "recommendation_refs": [".".join(path[:2])]
                        if path[0] in {"experiments", "gtm_strategy", "positioning", "pricing"}
                        else [],
                        "receipts": deepcopy(receipts),
                    }
                    claims.append(claim)
                return
            for key, value in node.items():
                walk(value, [*path, key])
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, [*path, str(index)])

    walk(report.content or {}, [])
    recommendations = [
        (set(c["source_ids"]), c["recommendation_refs"]) for c in claims if c["recommendation_refs"]
    ]
    for claim in claims:
        claim["recommendation_refs"] = sorted(
            {
                ref
                for source_ids, refs in recommendations
                if set(claim["source_ids"]) & source_ids
                for ref in refs
            }
        )
        claim["fingerprint"] = fingerprint(claim)
    return claims


def compare(claim, receipt, current):
    if current is None:
        return "unverifiable", "The source could not be retrieved. The original evidence is preserved.", ""
    text = current.text[:MAX_TEXT]
    if not normalize(text):
        return "unverifiable", "The source returned no usable text.", ""
    if normalize(claim["quote"]) in normalize(text):
        return None
    words = set(re.findall(r"\w{4,}", normalize(claim["quote"])))
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    relevant = [line for line in lines if words & set(re.findall(r"\w{4,}", normalize(line)))]
    if relevant:
        excerpt = "\n".join(relevant)[:2000]
        return (
            "changed",
            "The original quotation is no longer present. Related source text changed and needs review. "
            "A change alone does not establish a contradiction or a comparable billing scope.",
            excerpt,
        )
    return "unverifiable", "The original quotation was not found in the retrieved text.", text[:2000]
