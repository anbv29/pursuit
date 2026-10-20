"""Bounded, diverse company evidence; no paid search, external crawling or login."""

from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

from app.core.db import utcnow
from app.services import fetcher


def collect(page):
    origin = urlsplit(page.url)
    candidates = []
    for href in page.links:
        try:
            parts = urlsplit(urljoin(page.url, href))
        except ValueError:
            continue
        if (parts.scheme, parts.netloc) != (origin.scheme, origin.netloc):
            continue
        if parts.query or parts.fragment or parts.username or parts.password:
            continue
        if not any(
            term in parts.path.lower() for term in ("about", "pricing", "product", "solution", "customer")
        ):
            continue
        url = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
        if url != page.url and url not in candidates:
            candidates.append(url)
    # Round-robin page types so a long product menu cannot crowd out pricing or proof.
    groups = ("pricing", "customer", "product", "solution", "about")
    buckets = [[u for u in candidates if term in urlsplit(u).path.lower()] for term in groups]
    selected = []
    while any(buckets) and len(selected) < 4:
        for bucket in buckets:
            if bucket:
                url = bucket.pop(0)
                if url not in selected:
                    selected.append(url)
            if len(selected) == 4:
                break
    pages = [page]
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        for url in selected:
            try:
                found = fetcher.fetch(url, client=client)
                if urlsplit(found.url).netloc == origin.netloc and len(found.text.strip()) >= 40:
                    pages.append(found)
            except fetcher.FetchError:
                continue
    sources = [
        {"url": p.url, "title": p.title, "excerpt": p.text[:500], "retrieved_at": utcnow().isoformat()}
        for p in pages
    ]
    # Every selected source reaches the model rather than truncating the last pages away.
    text = "\n\n".join(f"PUBLIC PAGE: {p.url}\n{p.text[:2600]}" for p in pages)
    return fetcher.Fetched(page.url, page.title, text, page.sha256), sources
