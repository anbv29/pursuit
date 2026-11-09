import multiprocessing
import socket
import time
from types import SimpleNamespace

import httpx
import pytest

from app.core.config import get_settings
from app.services import fetcher, watch_fetch

pytestmark = pytest.mark.no_database


def completed_child(connection, snapshots):
    connection.send(("https://example.com", fetcher.Fetched("https://example.com", "", "Saved text", "hash")))
    connection.close()


def stalled_child(connection, snapshots):
    connection.send(("https://example.com", None))
    time.sleep(60)


def test_real_child_process_returns_receipts_and_stalled_fetch_is_terminated():
    before = {child.pid for child in multiprocessing.active_children()}
    result = watch_fetch.bounded_collect([], seconds=30, target=completed_child)
    assert result["https://example.com"].text == "Saved text"
    partial = watch_fetch.bounded_collect([], seconds=15, target=stalled_child)
    assert partial == {"https://example.com": None}
    assert {child.pid for child in multiprocessing.active_children()} == before


def test_watch_uses_safe_fetcher_and_caps_distinct_sources_and_time(monkeypatch):
    watch = SimpleNamespace(snapshots=[{"receipts": [{"url": f"https://example.com/{n}"} for n in range(9)]}])
    calls = []

    def safe_fetch(url, **kwargs):
        calls.append((url, kwargs["deadline"]))
        return fetcher.Fetched(url, "", "hello", "hash")

    monkeypatch.setattr(fetcher, "fetch", safe_fetch)
    assert len(watch_fetch.collect_sources(watch.snapshots)) == 4
    assert len(calls) == 4 and len({deadline for _, deadline in calls}) == 1
    times = iter([0, 31, 31, 31, 31])
    monkeypatch.setattr(watch_fetch.time, "monotonic", lambda: next(times))
    assert set(watch_fetch.collect_sources(watch.snapshots).values()) == {None}
    assert len(calls) == 4


def test_deadline_and_byte_caps_are_enforced_inside_fetcher(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.215.14", 0)),
        ],
    )
    monkeypatch.setattr(get_settings(), "research_fetch_max_bytes", 10)
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                text="A" * 11,
                headers={"content-type": "text/plain"},
            )
        )
    ) as client:
        with pytest.raises(fetcher.FetchError, match="too large"):
            fetcher.fetch("https://example.com", client)
        with pytest.raises(fetcher.FetchError, match="time limit"):
            fetcher.fetch("https://example.com", client, deadline=0)


def test_dns_that_finishes_after_deadline_cannot_start_http(monkeypatch):
    clock = [0]

    def slow_dns(*args):
        clock[0] = 120
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.215.14", 0))]

    def never_send(request):
        raise AssertionError("An expired DNS lookup must not be followed by HTTP")

    monkeypatch.setattr(socket, "getaddrinfo", slow_dns)
    monkeypatch.setattr(fetcher.time, "monotonic", lambda: clock[0])
    with (
        httpx.Client(transport=httpx.MockTransport(never_send)) as client,
        pytest.raises(fetcher.FetchError, match="time limit"),
    ):
        fetcher.fetch("https://example.com", client, deadline=30)


def test_failed_private_redirect_never_becomes_a_contradiction(monkeypatch):
    watch = SimpleNamespace(snapshots=[{"receipts": [{"url": "https://example.com"}]}])

    def resolve(host, *args):
        ip = "93.184.215.14" if host == "example.com" else "127.0.0.1"
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0))]

    monkeypatch.setattr(socket, "getaddrinfo", resolve)
    original = fetcher.fetch
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                302,
                headers={"location": "http://internal.test/"},
            )
        )
    ) as client:
        monkeypatch.setattr(fetcher, "fetch", lambda url, **kw: original(url, client, **kw))
        assert watch_fetch.collect_sources(watch.snapshots) == {"https://example.com": None}
