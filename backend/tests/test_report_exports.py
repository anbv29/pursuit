from datetime import timedelta
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.core.db import new_session, utcnow
from app.models import Report, ReportShare
from tests.test_report_export import document


@pytest.fixture
def saved_report(api):
    api.signup()
    workspace = api.workspace()
    with new_session() as db:
        row = Report(workspace_id=workspace, company_url="https://example.com", status="SUCCEEDED",
                     company_name="Café Δοκιμή", content=document()["content"], sources=document()["sources"],
                     inputs={"private_note": "private input marker"},
                     checkpoint={"hidden": "checkpoint marker"})
        db.add(row)
        db.commit()
        return workspace, str(row.id)


def text(response, extension):
    if extension == "md":
        return response.content.decode("utf-8")
    return "\n".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)


@pytest.mark.parametrize("extension", ["md", "pdf"])
def test_private_exports_require_membership(api, other, app, saved_report, extension):
    workspace, report = saved_report
    path = f"/api/workspaces/{workspace}/reports/{report}/export/{extension}"
    with TestClient(app) as anonymous:
        assert anonymous.get(path).status_code == 401
    assert other.get(path).status_code == 404
    response = api.get(path)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["content-disposition"].endswith(f'.{extension}"')
    media_type = "application/pdf" if extension == "pdf" else "text/markdown"
    assert response.headers["content-type"].startswith(media_type)
    exported = text(response, extension)
    assert "Café Δοκιμή" in exported and "private input marker" in exported
    assert "S5" in exported and "numeric assertion" in exported and "Still uncertain" in exported
    assert "checkpoint marker" not in exported
    member = api.post(f"/api/workspaces/{workspace}/members", {"email": "intruder@example.com"})
    assert member.status_code == 201
    assert other.get(path).status_code == 200


@pytest.mark.parametrize("status", ["QUEUED", "RUNNING", "FAILED", "CANCELLED"])
def test_unfinished_reports_cannot_be_exported(api, saved_report, status):
    workspace, report = saved_report
    with new_session() as db:
        db.get(Report, report).status = status
        db.commit()
    for extension in ["md", "pdf"]:
        assert api.get(f"/api/workspaces/{workspace}/reports/{report}/export/{extension}").status_code == 409


@pytest.mark.parametrize("extension", ["md", "pdf"])
def test_public_export_keeps_frozen_snapshot_and_obeys_revocation(api, app, saved_report, extension):
    workspace, report = saved_report
    shares = f"/api/workspaces/{workspace}/reports/{report}/shares"
    share = api.post(shares, {}).json()
    token = share["url"].rsplit("/", 1)[1]
    with new_session() as db:
        db.get(Report, report).content = {"changed": "new live marker"}
        db.commit()
    path = f"/api/shared-reports/{token}/export/{extension}"
    with TestClient(app) as anonymous:
        response = anonymous.get(path)
        assert response.status_code == 200
        exported = text(response, extension)
        assert "Still uncertain" in exported
        assert all(secret not in exported for secret in ["private input marker", "new live marker", token])
        assert response.headers["cache-control"] == "private, no-store"
        assert api.delete(f"{shares}/{share['id']}").status_code == 204
        assert anonymous.get(path).status_code == 404
        assert anonymous.get(f"/api/shared-reports/invalid/export/{extension}").status_code == 404


def test_expired_share_and_unknown_export_formats_are_rejected(api, saved_report):
    workspace, report = saved_report
    path = f"/api/workspaces/{workspace}/reports/{report}"
    assert api.get(f"{path}/export/html").status_code == 422
    share = api.post(f"{path}/shares", {}).json()
    with new_session() as db:
        db.get(ReportShare, share["id"]).expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    token = share["url"].rsplit("/", 1)[1]
    for extension in ["pdf", "md"]:
        assert api.get(f"/api/shared-reports/{token}/export/{extension}").status_code == 404
