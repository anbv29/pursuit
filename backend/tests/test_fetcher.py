import pytest

from app.services import fetcher
from app.services.fetcher import FetchError


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/admin",
        "http://localhost:8000/api/health",
        "http://169.254.169.254/latest/meta-data/",  # cloud metadata
        "http://10.0.0.5/",
        "http://[::1]/",
        "file:///etc/passwd",
        "ftp://example.com/x",
        "https://example.com:8443/",
    ],
)
def test_blocks_internal_and_non_http_targets(url):
    with pytest.raises(FetchError):
        fetcher._check_host(url)


def test_extract_ignores_scripts_and_gets_title():
    html = "<html><head><title>Acme Pricing</title><script>steal()</script></head><body><p>Pro $49</p></body>"
    title, text = fetcher.extract(html)
    assert title == "Acme Pricing"
    assert "steal" not in text and "Pro $49" in text
