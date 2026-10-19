import socket

import httpx
import pytest

from app.services import fetcher

pytestmark = pytest.mark.no_database


def public_dns(*args):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.215.14", 0))]


def test_fetch_connects_to_checked_ip_preserves_host_tls_and_provenance(monkeypatch):
    calls = []

    def resolve(*args):
        calls.append(args)
        if len(calls) > 1:
            raise AssertionError("A second hostname resolution would permit rebinding")
        return public_dns()

    monkeypatch.setattr(socket, "getaddrinfo", resolve)

    def respond(request):
        assert request.url.host == "93.184.215.14"
        assert request.headers["host"] == "example.com"
        assert request.extensions["sni_hostname"] == "example.com"
        return httpx.Response(
            200, text="<title>Example</title><p>Observed text</p>", headers={"content-type": "text/html"}
        )

    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        result = fetcher.fetch("https://example.com/research", client)
    assert result.url == "https://example.com/research"
    assert result.title == "Example" and "Observed text" in result.text
    assert len(calls) == 1


def test_redirect_cannot_reach_private_address(monkeypatch):
    def resolve(host, *args):
        return public_dns() if host == "example.com" else [(socket.AF_INET, 1, 6, "", ("127.0.0.1", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    with (
        httpx.Client(
            transport=httpx.MockTransport(
                lambda _: httpx.Response(302, headers={"location": "http://internal.test/"})
            )
        ) as client,
        pytest.raises(fetcher.FetchError, match="publicly routable"),
    ):
        fetcher.fetch("https://example.com", client)


@pytest.mark.parametrize(
    "url", ["https://u:p@example.com", "https://example.com:80", "https://example.com:bad"]
)
def test_unsafe_urls_are_controlled_errors(url):
    with pytest.raises(fetcher.FetchError):
        fetcher._check_host(url)
