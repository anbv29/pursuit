"""SSRF-hardened fetcher for research sources.

- http/https only, default ports only
- every hostname (including each redirect hop) must resolve exclusively to public IPs
- at most 3 redirects, hard byte cap, short timeouts, text content types only
Fetched content is untrusted: it is stored as an excerpt and never executed or
treated as instructions.

Connections use the validated IP directly, with the original HTTP Host and TLS
server name preserved. Environment proxy settings cannot bypass the IP check.
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


def _check_host(url: str) -> str:
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError as exc:
        raise FetchError("Invalid website address.") from exc
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise FetchError("Only http(s) URLs can be fetched.")
    if parts.username is not None or parts.password is not None:
        raise FetchError("Website URLs cannot contain credentials.")
    if port not in (None, 443 if parts.scheme == "https" else 80):
        raise FetchError("Non-standard ports are not allowed.")
    try:
        infos = socket.getaddrinfo(parts.hostname, None)
    except socket.gaierror as exc:
        raise FetchError("Could not resolve that host.") from exc
    addresses = []
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global or ip.is_multicast:
            raise FetchError("That address is not publicly routable and can't be fetched.")
        addresses.append(ip)
    if not addresses:
        raise FetchError("Could not resolve that host.")
    return str(next((ip for ip in addresses if ip.version == 4), addresses[0]))


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template", "nav", "footer"}
    BLOCKS = {"p", "div", "section", "article", "main", "h1", "h2", "h3", "li", "br"}

    def __init__(self) -> None:
        super().__init__()
        self.title, self.parts, self._skip, self._in_title = "", [], 0, False
        self._stack = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        skip = (
            tag in self.SKIP
            or attributes.get("role") in {"navigation", "contentinfo", "menu", "menubar"}
            or "hidden" in attributes
            or attributes.get("aria-hidden") == "true"
        )
        if tag not in {
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "param",
            "source",
            "track",
            "wbr",
        }:
            self._stack.append((tag, skip))
        else:
            skip = False
        if skip:
            self._skip += 1
        if tag == "title":
            self._in_title = True
        if tag in self.BLOCKS and not self._skip:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                self._skip -= sum(skipped for _, skipped in self._stack[index:])
                del self._stack[index:]
                break
        if tag == "title":
            self._in_title = False
        if tag in self.BLOCKS and not self._skip:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title and not self.title:
            self.title = data.strip()
        elif not self._skip:
            self.parts.append(data)


def extract(html: str) -> tuple[str, str]:
    p = _TextExtractor()
    p.feed(html)
    lines = [re.sub(r"\s+", " ", line).strip() for line in " ".join(p.parts).splitlines()]
    text = "\n".join(dict.fromkeys(line for line in lines if line))
    return p.title[:300], text


def fetch(url: str, client: httpx.Client | None = None) -> Fetched:
    s = get_settings()
    own = client is None
    client = client or httpx.Client(
        timeout=s.research_fetch_timeout_seconds, follow_redirects=False, trust_env=False
    )
    try:
        for _ in range(MAX_REDIRECTS + 1):
            address = _check_host(url)
            original = httpx.URL(url)
            with client.stream(
                "GET",
                original.copy_with(host=address),
                headers={"User-Agent": "PursuitResearchBot/0.1", "Host": original.netloc.decode("ascii")},
                extensions={"sni_hostname": original.host},
            ) as r:
                if r.is_redirect:
                    url = urljoin(url, r.headers.get("location", ""))
                    continue
                if r.status_code >= 400:
                    raise FetchError(f"The page returned HTTP {r.status_code}.")
                ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
                if ctype not in ALLOWED_TYPES:
                    raise FetchError("Only HTML or plain-text pages can be imported.")
                body = b""
                for chunk in r.iter_bytes(chunk_size=65536):
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
