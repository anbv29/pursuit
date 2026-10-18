"""Postgres-backed report queue. Leases and checkpoints survive process restarts."""

import logging
import threading
from datetime import timedelta

from sqlalchemy import or_, select, update

from app.core.db import new_session, utcnow
from app.models import Report

logger = logging.getLogger("pursuit.worker")
LEASE = timedelta(seconds=90)


def eligible():
    return or_(
        Report.status == "QUEUED",
        (Report.status == "RUNNING")
        & or_(
            Report.lease_until < utcnow(),
            Report.lease_until.is_(None) & (Report.updated_at < utcnow() - LEASE),
        ),
    )


def heartbeat(report_id, owner, stop):
    while not stop.wait(20):
        try:
            with new_session() as db:
                result = db.execute(
                    update(Report)
                    .where(Report.id == report_id, Report.lease_owner == owner, Report.status == "RUNNING")
                    .values(lease_until=utcnow() + LEASE)
                )
                db.commit()
                if not result.rowcount:
                    return
        except Exception:
            logger.exception("Report heartbeat failed")


def work(stop):
    from app.services.reports import run

    while not stop.is_set():
        try:
            with new_session() as db:
                report_id = db.scalar(
                    select(Report.id).where(eligible()).order_by(Report.created_at).limit(1)
                )
            if report_id:
                run(report_id)
                continue
        except Exception:
            logger.exception("Report worker iteration failed")
        stop.wait(3)


def start():
    stop = threading.Event()
    thread = threading.Thread(target=work, args=(stop,), name="report-worker", daemon=True)
    thread.start()
    return stop
