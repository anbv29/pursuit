import uuid

from fastapi.testclient import TestClient

from app.core.db import new_session
from app.models import FirstLook


def test_retired_preview_endpoints_cannot_read_generate_or_create_experiments(api):
    api.signup()
    workspace = api.workspace(paid=False)
    path = f"/api/workspaces/{workspace}/first-look"
    assert api.get(path).status_code == 404
    assert api.post(path, {"company_url": "https://example.com"}).status_code == 404
    assert api.post(path + "/experiment", {}).status_code == 404
    with TestClient(api.client.app) as anonymous:
        assert anonymous.get(path).status_code == 404


def test_historical_preview_stays_exportable_and_workspace_deletion_erases_it(api, other):
    user = api.signup()
    workspace = api.workspace(paid=False)
    result = {"summary": "Previously saved preview"}
    with new_session() as db:
        db.add(
            FirstLook(
                user_id=uuid.UUID(user["id"]),
                workspace_id=uuid.UUID(workspace),
                status="SUCCEEDED",
                company_url="https://example.com",
                result=result,
            )
        )
        db.commit()
    export = f"/api/workspaces/{workspace}/export"
    assert api.get(export).json()["first_look"][0]["result"] == result
    assert other.get(export).status_code == 404
    assert api.delete(f"/api/workspaces/{workspace}").status_code == 204
    with new_session() as db:
        saved = db.get(FirstLook, uuid.UUID(user["id"]))
        assert saved.result is None and saved.company_url == ""
