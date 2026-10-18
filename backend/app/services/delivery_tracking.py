"""Read-only Resend adapter. Schema verified from Resend's Retrieve Sent Email docs."""

import uuid

import httpx
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import AppError, Conflict
from app.models import OutcomeEvent
from app.models.enums import ActionKind, ActionStatus, DataOrigin, OutcomeKind
from app.models.tracking import DeliveryTracking
from app.services import audit


def configured(workspace_id):
    s = get_settings()
    return bool(s.resend_api_key and s.resend_workspace_id == str(workspace_id))


def retrieve(message_id):
    try:
        message_id = str(uuid.UUID(message_id))
        response = httpx.get(
            f"https://api.resend.com/emails/{message_id}",
            timeout=15,
            headers={"Authorization": f"Bearer {get_settings().resend_api_key.get_secret_value()}"},
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError
        return data
    except (httpx.HTTPError, ValueError) as exc:
        raise AppError("Resend could not verify this message. Check the connection and message ID.") from exc


def sync(db, exp, action, message_id):
    if not configured(exp.workspace_id):
        raise AppError("Resend delivery tracking is not configured for this workspace.", "not_configured")
    if (
        action.mode != "live"
        or action.kind != ActionKind.SEND_EMAIL
        or action.status not in (ActionStatus.SUCCEEDED, ActionStatus.UNKNOWN)
    ):
        raise AppError("Link only a live email that has already been executed.")
    data = retrieve(message_id)
    if data.get("to") != [action.target] or data.get("subject") != action.payload.get("subject"):
        raise AppError("This provider email does not match the approved recipient and subject.")
    # Serialize with manual confirmation so a sent event is never recorded twice.
    db.refresh(action, with_for_update=True)
    if action.status not in (ActionStatus.SUCCEEDED, ActionStatus.UNKNOWN):
        raise Conflict("The action changed while verification was in progress. Review it again.")
    row = db.get(DeliveryTracking, action.id)
    if row and row.provider_message_id != message_id:
        raise Conflict("This action is already linked to a different email.")
    duplicate = db.scalar(
        select(DeliveryTracking.action_id).where(
            DeliveryTracking.provider_message_id == message_id, DeliveryTracking.action_id != action.id
        )
    )
    if duplicate:
        raise Conflict("That provider email is already linked to another action.")
    if row is None:
        row = DeliveryTracking(action_id=action.id, provider_message_id=message_id)
        db.add(row)
    row.last_event = str(data.get("last_event") or "unknown")[:40]
    row.checked_at, row.error = utcnow(), None
    verified_sent = row.last_event in {"sent", "delivered", "opened", "clicked", "bounced", "complained"}
    if verified_sent:
        action.status = ActionStatus.SUCCEEDED
    kinds = [OutcomeKind.SENT] if verified_sent else []
    if row.last_event in {"delivered", "opened", "clicked"}:
        kinds.append(OutcomeKind.DELIVERED)
    for kind in kinds:
        if not db.scalar(
            select(OutcomeEvent.id).where(OutcomeEvent.action_id == action.id, OutcomeEvent.kind == kind)
        ):
            db.add(
                OutcomeEvent(
                    experiment_id=exp.id,
                    action_id=action.id,
                    variant_id=action.variant_id,
                    prospect_id=action.prospect_id,
                    kind=kind,
                    origin=DataOrigin.IMPORT,
                    note=f"Verified from Resend: {message_id}",
                )
            )
    audit.record(
        db,
        "action.delivery_verified",
        actor_id=action.requested_by,
        workspace_id=exp.workspace_id,
        target_id=action.id,
        detail={"provider": "resend", "event": row.last_event},
    )
    db.commit()
    return {
        "provider": row.provider,
        "last_event": row.last_event,
        "checked_at": row.checked_at,
        "provider_message_id": row.provider_message_id,
    }
