from datetime import timedelta

from sqlalchemy import select

from app.core.db import new_session, utcnow
from app.models import Membership, ReportWatch, WatchAlert
from app.models.enums import Role
from app.services import watch_worker
from tests.test_report_watches import changed, enable


def test_members_can_read_check_acknowledge_but_only_owners_configure(api, watched, other, monkeypatch):
    ws, _, path, owner_id = watched
    enable(api, path)
    changed(monkeypatch)
    assert watch_worker.run_due()
    alert = api.get(path).json()["alerts"][0]
    foreign_ws = other.workspace()
    assert (
        other.patch(
            f"/api/workspaces/{foreign_ws}/watch-alerts/{alert['id']}",
            {
                "acknowledged": True,
            },
        ).status_code
        == 404
    )
    assert other.post(path + "/check").status_code == 404
    with new_session() as db:
        owner = db.scalar(select(Membership).where(Membership.user_id == owner_id))
        owner.role = Role.MEMBER
        db.commit()
    assert api.get(path).status_code == 200
    assert api.post(path, {"enabled": False}).status_code == 403
    assert api.post(path + "/check").status_code == 202
    endpoint = f"/api/workspaces/{ws}/watch-alerts/{alert['id']}"
    assert api.client.patch(endpoint, json={"acknowledged": True}).status_code == 403
    assert api.patch(endpoint, {"acknowledged": True}).status_code == 200
    assert api.get(f"/api/workspaces/{ws}/watch-alerts").json()[0]["acknowledged_at"]


def test_manual_checks_are_rate_limited_and_configuration_validates_claims(api, watched):
    _, _, path, _ = watched
    assert api.post(path, {"enabled": True, "claim_ids": ["invented"]}).status_code == 400
    assert api.post(path, {"enabled": True, "claim_ids": ["x"] * 6}).status_code == 422
    assert api.post(path, {"enabled": True, "claim_ids": []}).status_code == 400
    enable(api, path)
    for _ in range(10):
        assert api.post(path + "/check").status_code == 202
    assert api.post(path + "/check").status_code == 429


def test_acknowledging_old_alert_does_not_depend_on_listing_window(api, watched):
    ws, rid, path, _ = watched
    enable(api, path)
    with new_session() as db:
        watch = db.scalar(select(ReportWatch))
        old = WatchAlert(
            watch_id=watch.id,
            report_id=rid,
            dedupe_key="old",
            payload={},
            created_at=utcnow() - timedelta(days=1),
        )
        db.add(old)
        for index in range(101):
            db.add(
                WatchAlert(
                    watch_id=watch.id, report_id=rid, dedupe_key=str(index), payload={}, created_at=utcnow()
                )
            )
        db.commit()
        old_id = str(old.id)
    assert len(api.get(f"/api/workspaces/{ws}/watch-alerts").json()) == 100
    response = api.patch(f"/api/workspaces/{ws}/watch-alerts/{old_id}", {"acknowledged": True})
    assert response.status_code == 200 and response.json()["id"] == old_id
