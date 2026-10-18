from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from cryptography.fernet import Fernet

from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.models.connection import FoConnection
from app.services import fo_oauth


@pytest.fixture
def oauth(monkeypatch):
    monkeypatch.setenv("CONNECTION_ENCRYPTION_KEY", Fernet.generate_key().decode())
    get_settings.cache_clear()
    calls = []

    def request(path, **kw):
        calls.append((path, kw))
        return (
            {"client_id": "test-client"}
            if path.endswith("register")
            else {"access_token": "new-access", "refresh_token": "rotated-refresh", "expires_in": 3600}
        )

    monkeypatch.setattr(fo_oauth, "request", request)
    yield calls
    get_settings.cache_clear()


def test_pkce_callback_bound_to_user_and_single_use(api, other, oauth):
    user = api.signup()
    ws = api.workspace()
    url = api.post(f"/api/workspaces/{ws}/fo/connect").json()["url"]
    query = parse_qs(urlsplit(url).query)
    assert query["code_challenge_method"] == ["S256"]
    state = query["state"][0]
    callback = f"/api/fo/oauth/callback?code=test-code&state={state}"
    assert other.get(callback, follow_redirects=False).status_code == 303
    response = api.get(callback, follow_redirects=False)
    assert response.status_code == 303 and "fo=connected" in response.headers["location"]
    with new_session() as db:
        c = db.get(FoConnection, user["id"])
        assert "new-access" not in c.token_blob and "rotated-refresh" not in c.token_blob
    assert "fo=reconnect" in api.get(callback, follow_redirects=False).headers["location"]


def test_expired_token_refreshes_and_is_isolated(api, other, oauth):
    user = api.signup()
    other_id = other.get("/api/auth/me").json()["user"]["id"]
    with new_session() as db:
        db.add(
            FoConnection(
                user_id=user["id"],
                client_id="client",
                token_blob=fo_oauth.seal({"access_token": "old", "refresh_token": "refresh"}),
                expires_at=utcnow() - timedelta(seconds=1),
            )
        )
        db.commit()
    assert fo_oauth.access_token(user["id"]) == "new-access"
    assert oauth[-1][1]["form"]["refresh_token"] == "refresh"
    count = len(oauth)
    assert fo_oauth.access_token(user["id"]) == "new-access" and len(oauth) == count
    with pytest.raises(fo_oauth.AppError, match="own Fo account"):
        fo_oauth.access_token(other_id)
    assert api.delete("/api/fo/connection").status_code == 204
    with pytest.raises(fo_oauth.AppError):
        fo_oauth.access_token(user["id"])
