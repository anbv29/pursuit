import logging

from app.core.log_redaction import AccessRedaction, safe_path


def test_bearer_paths_and_oauth_codes_are_redacted():
    assert safe_path("/api/shared-reports/private-secret") == "/api/shared-reports/[redacted]"
    assert safe_path("/shared/private-secret") == "/shared/[redacted]"
    assert (
        safe_path("/api/fo/oauth/callback?code=secret&state=private") == "/api/fo/oauth/callback?[redacted]"
    )
    assert safe_path("/api/health") == "/api/health"
    record = logging.LogRecord(
        "access",
        logging.INFO,
        "",
        1,
        "%s %s %s %s %s",
        ("client", "GET", "/api/shared-reports/private-secret", "1.1", 200),
        None,
    )
    assert AccessRedaction().filter(record)
    assert "private-secret" not in record.getMessage()
