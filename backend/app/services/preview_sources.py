"""At most two extra linked company pages; no paid search, external crawling or login."""

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
    pages = [page]
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        for url in candidates[:2]:
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
    text = "\n\n".join(f"PUBLIC PAGE: {p.url}\n{p.text[:4500]}" for p in pages)
    return fetcher.Fetched(page.url, page.title, text, page.sha256), sources
