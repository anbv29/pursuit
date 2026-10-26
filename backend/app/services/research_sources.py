"""Bounded evidence crawl: real links, diverse page types, no paid search."""

import re
import time
from collections import deque
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

from app.core.db import utcnow
from app.services import fetcher

MAX_SOURCES = 24
MAX_ATTEMPTS = 32
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
    references = inputs.get("research_urls", [])[:6]
    roots = [
        (company_url, "company"),
        *((url.rstrip(".)"), "supplied_competitor") for url in supplied),
        *((str(url), "supplied_reference") for url in references),
    ]
    queues = deque(deque([(url, role, 0)]) for url, role in roots)
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        while queues and attempts < MAX_ATTEMPTS and len(result) < MAX_SOURCES:
            if time.monotonic() - started >= MAX_SECONDS:
                break
            queue = queues.popleft()
            url, role, depth = queue.popleft()
            if queue:
                queues.append(queue)
            if url in seen:
                continue
            seen.add(url)
            attempts += 1
            source = {
                "id": f"S{len(result) + 1}",
                "url": url,
                "title": "",
                "excerpt": "",
                "retrieved_at": utcnow().isoformat(),
                "via": "pursuit_fetch",
                "source_role": role,
                "retrieval_status": "unavailable",
            }
            try:
                page = fetcher.fetch(url, client=client)
            except fetcher.FetchError:
                result.append(source)
                continue
            if depth and (urlsplit(page.url).scheme, urlsplit(page.url).netloc) != (
                urlsplit(url).scheme,
                urlsplit(url).netloc,
            ):
                result.append(source)
                continue
            if page.url != url and page.url in seen:
                continue
            seen.add(page.url)
            text = page.text.strip()
            if page.sha256 and page.sha256 in hashes:
                continue
            if page.sha256:
                hashes.add(page.sha256)
            source.update(
                url=page.url,
                title=page.title,
                sha256=page.sha256,
                excerpt=text[:EXCERPT_CHARS] if len(text) >= 40 else "",
                retrieval_status="available" if len(text) >= 40 else "unavailable",
            )
            result.append(source)
            if depth < 2:
                links = candidates(page)
                # Each root gets one fetch per round, including supplied references.
                if not queue and links:
                    queues.append(queue)
                queue.extend((link, role, depth + 1) for link in links)
    return result
