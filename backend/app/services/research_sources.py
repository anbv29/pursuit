"""Bounded evidence crawl: real links, diverse page types, no paid search."""

import re
import time
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

from app.core.db import utcnow
from app.services import fetcher

MAX_SOURCES = 12
MAX_ATTEMPTS = 18
MAX_SECONDS = 45
EXCERPT_CHARS = 6000
PAGE_TYPES = (
    "pricing",
    "customer",
    "case-stud",
    "comparison",
    "security",
    "integrat",
    "docs",
    "product",
    "solution",
    "about",
)


def candidates(page):
    """Follow relevant same-origin links only; supplied competitors are separate roots."""
    origin = urlsplit(page.url)
    buckets = {kind: [] for kind in PAGE_TYPES}
    for href in page.links[:500]:
        try:
            parts = urlsplit(urljoin(page.url, href))
        except ValueError:
            continue
        if (parts.scheme, parts.netloc) != (origin.scheme, origin.netloc):
            continue
        if parts.query or parts.fragment or parts.username or parts.password:
            continue
        path = parts.path.lower()
        if any(term in path for term in ("logout", "signout", "delete", "checkout", "cart")):
            continue
        kind = next((kind for kind in PAGE_TYPES if kind in path), None)
        if kind:
            url = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
            if url != page.url and url not in buckets[kind]:
                buckets[kind].append(url)
    selected = []
    while any(buckets.values()) and len(selected) < 8:
        for bucket in buckets.values():
            if bucket and len(selected) < 8:
                selected.append(bucket.pop(0))
    return selected


def collect(company_url, inputs):
    started = time.monotonic()
    attempts, seen, hashes, result = 0, set(), set(), []
    supplied = re.findall(r"https?://[^\s,<>\"']+", inputs.get("known_competitors", ""))[:3]
    roots = [(company_url, "company"), *((url.rstrip(".)"), "supplied_competitor") for url in supplied)]
    queue = [(url, role, 0) for url, role in roots]
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        while queue and attempts < MAX_ATTEMPTS and len(result) < MAX_SOURCES:
            if time.monotonic() - started >= MAX_SECONDS:
                break
            url, role, depth = queue.pop(0)
            if url in seen:
                continue
            seen.add(url)
            attempts += 1
            try:
                page = fetcher.fetch(url, client=client)
            except fetcher.FetchError:
                continue
            if depth and (urlsplit(page.url).scheme, urlsplit(page.url).netloc) != (
                urlsplit(url).scheme,
                urlsplit(url).netloc,
            ):
                continue
            text = page.text.strip()
            if len(text) < 40 or page.sha256 in hashes:
                continue
            hashes.add(page.sha256)
            result.append(
                {
                    "id": f"S{len(result) + 1}",
                    "url": page.url,
                    "title": page.title,
                    "excerpt": text[:EXCERPT_CHARS],
                    "retrieved_at": utcnow().isoformat(),
                    "sha256": page.sha256,
                    "via": "pursuit_fetch",
                    "source_role": role,
                }
            )
            if depth < 2:
                links = candidates(page)
                # Reserve room for every root before traversing deeper company menus.
                limit = 8 if role == "company" else 2
                queue.extend((link, role, depth + 1) for link in links[:limit])
    return result
