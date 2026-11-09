import multiprocessing
import time
from contextlib import suppress

from app.services import fetcher
from app.services.watch_claims import MAX_SOURCES

CHECK_SECONDS = 30


def collect_sources(snapshots, deliver=None):
    deadline = time.monotonic() + CHECK_SECONDS
    urls = list(dict.fromkeys(r["url"] for c in snapshots for r in c["receipts"]))[:MAX_SOURCES]
    results = {}
    for url in urls:
        current = None
        if time.monotonic() < deadline:
            with suppress(fetcher.FetchError, OSError, ValueError):
                current = fetcher.fetch(url, deadline=deadline)
        results[url] = current
        if deliver:
            deliver((url, current))
    return results


def _fetch_child(connection, snapshots):
    try:
        collect_sources(snapshots, connection.send)
    finally:
        connection.close()


def bounded_collect(snapshots, *, seconds=CHECK_SECONDS, target=_fetch_child):
    context = multiprocessing.get_context("spawn")
    receiver, sender = context.Pipe(duplex=False)
    process = context.Process(target=target, args=(sender, snapshots), daemon=True)
    results = {}
    deadline = time.monotonic() + seconds
    try:
        process.start()
        sender.close()
        while (remaining := deadline - time.monotonic()) > 0:
            try:
                if not receiver.poll(remaining):
                    break
                url, current = receiver.recv()
            except (EOFError, OSError):
                break
            results[url] = current
    finally:
        sender.close()
        receiver.close()
        if process.pid is not None:
            if process.is_alive():
                process.terminate()
            process.join(timeout=2)
            if process.is_alive():
                process.kill()
                process.join(timeout=2)
            process.close()
    return results
