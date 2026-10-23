"""Fetch real public evidence without paid search or model-invented source URLs."""

import re

import httpx

from app.core.db import utcnow
from app.services import fetcher, preview_sources


def collect(company_url, inputs):
    pages = []
    with httpx.Client(timeout=4, follow_redirects=False, trust_env=False) as client:
        try:
            home = fetcher.fetch(company_url, client=client)
            _, pages = preview_sources.collect(home)
        except fetcher.FetchError:
            pass
        urls = re.findall(r"https?://[^\s,<>\"']+", inputs.get("known_competitors", ""))[:3]
        for url in urls:
            try:
                page = fetcher.fetch(url.rstrip(".)"), client=client)
            except fetcher.FetchError:
                continue
            pages.append(
                {
                    "url": page.url,
                    "title": page.title,
                    "excerpt": page.text[:2500],
                    "retrieved_at": utcnow().isoformat(),
                }
            )
    seen = set()
    result = []
    for page in pages:
        if page["url"] in seen:
            continue
        seen.add(page["url"])
        result.append(dict(page, id=f"S{len(result) + 1}", via="pursuit_fetch"))
    return result
