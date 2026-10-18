"""SSRF-hardened fetcher for research sources.

- http/https only, default ports only
- every hostname (including each redirect hop) must resolve exclusively to public IPs
- at most 3 redirects, hard byte cap, short timeouts, text content types only
Fetched content is untrusted: it is stored as an excerpt and never executed or
treated as instructions.

Known limitation: DNS could change between our check and httpx's own resolution
(rebinding). Documented in docs/SECURITY_CHECKLIST.md.
"""

import hashlib
import ipaddress
import re
import socket
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import httpx

from app.core.config import get_settings
from app.core.errors import AppError

MAX_REDIRECTS = 3
ALLOWED_TYPES = ("text/html", "text/plain", "application/xhtml+xml")


class FetchError(AppError):
    code = "fetch_failed"


@dataclass
class Fetched:
    url: str
    title: str
    text: str
    sha256: str


def _check_host(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise FetchError("Only http(s) URLs can be fetched.")
    if parts.port not in (None, 80, 443):
        raise FetchError("Non-standard ports are not allowed.")
    try:
        infos = socket.getaddrinfo(parts.hostname, None)
    except socket.gaierror as exc:
        raise FetchError("Could not resolve that host.") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global or ip.is_multicast:
            raise FetchError("That address is not publicly routable and can't be fetched.")


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self) -> None:
        super().__init__()
        self.title, self.parts, self._skip, self._in_title = "", [], 0, False

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        self._in_title = tag == "title"

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        self._in_title = False

    def handle_data(self, data):
        if self._in_title and not self.title:
            self.title = data.strip()
        elif not self._skip:
            self.parts.append(data)


def extract(html: str) -> tuple[str, str]:
    p = _TextExtractor()
    p.feed(html)
    text = re.sub(r"\s+", " ", " ".join(p.parts)).strip()
    return p.title[:300], text


def fetch(url: str, client: httpx.Client | None = None) -> Fetched:
    s = get_settings()
    own = client is None
    client = client or httpx.Client(timeout=s.research_fetch_timeout_seconds, follow_redirects=False)
    try:
        for _ in range(MAX_REDIRECTS + 1):
            _check_host(url)
            with client.stream("GET", url, headers={"User-Agent": "PursuitResearchBot/0.1"}) as r:
                if r.is_redirect:
                    url = urljoin(url, r.headers.get("location", ""))
                    continue
                if r.status_code >= 400:
                    raise FetchError(f"The page returned HTTP {r.status_code}.")
                ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
                if ctype not in ALLOWED_TYPES:
                    raise FetchError("Only HTML or plain-text pages can be imported.")
                body = b""
                for chunk in r.iter_bytes():
                    body += chunk
                    if len(body) > s.research_fetch_max_bytes:
                        raise FetchError("The page is too large to import.")
            raw = body.decode(r.encoding or "utf-8", errors="replace")
            title, text = extract(raw) if ctype != "text/plain" else ("", raw)
            return Fetched(url=url, title=title, text=text[:8000], sha256=hashlib.sha256(body).hexdigest())
        raise FetchError("Too many redirects.")
    except httpx.HTTPError as exc:
        raise FetchError("Couldn't reach that page (timeout or connection error).") from exc
    finally:
        if own:
            client.close()
