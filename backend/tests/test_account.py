from sqlalchemy import select

from app.core import db as dbmod
from app.models import Membership, User, Workspace
from app.models.enums import Role


def test_password_change_revokes_sessions(api, app):
    from tests.conftest import Api

    api.signup()
    second = Api(app)
    session = second.post(
        "/api/auth/login", {"email": "founder@example.com", "password": "correct-horse-battery"}
    )
    second.csrf = session.json()["csrf_token"]
    path = "/api/account/password"
    assert (
        api.post(path, {"current_password": "wrong", "new_password": "a-new-long-password"}).status_code
        == 401
    )
    assert (
        api.post(path, {"current_password": "correct-horse-battery", "new_password": "short"}).status_code
        == 422
    )
    assert (
        api.post(
            path, {"current_password": "correct-horse-battery", "new_password": "correct-horse-battery"}
        ).status_code
        == 409
    )
    assert (
        api.post(
            path, {"current_password": "correct-horse-battery", "new_password": "a-new-long-password"}
        ).status_code
        == 204
    )
    assert api.get("/api/auth/me").status_code == 401
    assert second.get("/api/auth/me").status_code == 401
    assert (
        api.post(
            "/api/auth/login", {"email": "founder@example.com", "password": "correct-horse-battery"}
        ).status_code
        == 401
    )
    assert (
        api.post(
            "/api/auth/login", {"email": "founder@example.com", "password": "a-new-long-password"}
        ).status_code
        == 200
    )


def test_account_deletion_and_guards(api):
    body = {"current_password": "correct-horse-battery", "confirmation": "DELETE MY ACCOUNT"}
    assert api.client.request("DELETE", "/api/account", json=body).status_code == 401
    api.signup()
    assert api.client.request("DELETE", "/api/account", json=body).status_code == 403
    assert (
        api.client.request(
            "DELETE", "/api/account", json={**body, "confirmation": "delete"}, headers=api._h()
        ).status_code
        == 422
    )
    ws = api.workspace(paid=False)
    assert api.client.request("DELETE", "/api/account", json=body, headers=api._h()).status_code == 409
    assert api.delete(f"/api/workspaces/{ws}").status_code == 204
    assert api.client.request("DELETE", "/api/account", json=body, headers=api._h()).status_code == 204
    assert api.get("/api/auth/me").status_code == 401
    with dbmod.new_session() as db:
        assert db.scalar(select(User).where(User.email == "founder@example.com")) is None


def test_deleting_member_preserves_shared_workspace(api, other):
    owner = api.signup()
    workspace_id = api.workspace(paid=False)
    member = other.get("/api/auth/me").json()["user"]
    from uuid import UUID

    with dbmod.new_session() as db:
        db.add(Membership(workspace_id=UUID(workspace_id), user_id=UUID(member["id"]), role=Role.MEMBER))
        db.commit()
    response = other.client.request(
        "DELETE",
        "/api/account",
        headers=other._h(),
        json={
            "current_password": "correct-horse-battery",
            "confirmation": "DELETE MY ACCOUNT",
        },
    )
    assert response.status_code == 204
    with dbmod.new_session() as db:
        assert db.get(Workspace, UUID(workspace_id)) is not None
        assert db.get(User, UUID(owner["id"])) is not None
        assert db.get(User, UUID(member["id"])) is None
