def test_health(api):
    r = api.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": True, "fo_mode": "demo"}
    assert r.headers["X-Content-Type-Options"] == "nosniff"


def test_register_login_me_logout(api):
    api.signup()
    me = api.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["user"]["email"] == "founder@example.com"
    assert api.post("/api/auth/logout").status_code == 204
    assert api.get("/api/auth/me").status_code == 401


def test_session_cookie_is_httponly(api):
    r = api.post("/api/auth/register", {"email": "a@example.com", "name": "A", "password": "long-enough-pw"})
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie


def test_duplicate_email_rejected_case_insensitive(api):
    api.signup(email="dup@example.com")
    r = api.post(
        "/api/auth/register", {"email": "DUP@example.com", "name": "B", "password": "another-long-pw"}
    )
    assert r.status_code == 409


def test_bad_login_is_generic(api):
    api.signup()
    r1 = api.post("/api/auth/login", {"email": "founder@example.com", "password": "wrong-password"})
    r2 = api.post("/api/auth/login", {"email": "nobody@example.com", "password": "wrong-password"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json() == r2.json()


def test_login_rate_limited(api):
    api.signup()
    codes = [
        api.post("/api/auth/login", {"email": "founder@example.com", "password": "nope-nope"}).status_code
        for _ in range(10)
    ]
    assert 429 in codes


def test_weak_password_and_bad_email_rejected(api):
    r = api.post("/api/auth/register", {"email": "not-an-email", "name": "X", "password": "short"})
    assert r.status_code == 422


def test_anonymous_cannot_access_workspaces(api):
    assert api.get("/api/workspaces").status_code == 401
    assert api.post("/api/workspaces", {"name": "x"}).status_code == 401


def test_csrf_required_for_mutations(api):
    api.signup()
    api.csrf = None
    r = api.post("/api/workspaces", {"name": "No CSRF"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed"


def test_workspace_isolation(api, other):
    api.signup()
    ws = api.workspace()
    assert [w["id"] for w in api.get("/api/workspaces").json()] == [ws]
    assert other.get("/api/workspaces").json() == []
    assert other.get(f"/api/workspaces/{ws}").status_code == 404
    assert other.get(f"/api/workspaces/{ws}/members").status_code == 404
    assert other.delete(f"/api/workspaces/{ws}").status_code == 404


def test_member_access_but_not_owner_actions(api, other):
    api.signup()
    ws = api.workspace()
    assert api.post(f"/api/workspaces/{ws}/members", {"email": "intruder@example.com"}).status_code == 201
    assert other.get(f"/api/workspaces/{ws}").json()["role"] == "member"
    assert other.get(f"/api/workspaces/{ws}/audit").status_code == 403
    assert other.delete(f"/api/workspaces/{ws}").status_code == 403


def test_delete_workspace(api):
    api.signup()
    ws = api.workspace()
    assert api.delete(f"/api/workspaces/{ws}").status_code == 204
    assert api.get(f"/api/workspaces/{ws}").status_code == 404


def test_demo_workspace_is_seeded_and_labelled(api):
    api.signup()
    r = api.post("/api/workspaces", {"name": "Demo", "with_demo_data": True})
    assert r.status_code == 201 and r.json()["is_demo"] is True
    ws = r.json()["id"]
    dash = api.get(f"/api/workspaces/{ws}/dashboard").json()
    assert len(dash["experiments"]) == 4 and all(e["is_demo"] for e in dash["experiments"])
    assert dash["recommendations"][0]["includes_demo_data"] is True
    assert all(o["origin"] == "demo" for o in dash["recent_outcomes"])
    integ = api.get(f"/api/workspaces/{ws}/integrations").json()
    assert integ["fo"]["mode"] == "demo" and integ["fo"]["verified_live"] is False


def test_export_is_owner_only(api, other):
    api.signup()
    ws = api.workspace()
    api.post(f"/api/workspaces/{ws}/members", {"email": "intruder@example.com"})
    assert api.get(f"/api/workspaces/{ws}/export").status_code == 200
    assert other.get(f"/api/workspaces/{ws}/export").status_code == 403
