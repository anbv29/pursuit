import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditEvent


def record(
    db: Session,
    action: str,
    *,
    actor_id: uuid.UUID | None,
    workspace_id: uuid.UUID | None = None,
    target_type: str | None = None,
    target_id: uuid.UUID | str | None = None,
    detail: dict[str, Any] | None = None,
) -> AuditEvent:
    """Append an audit event. Caller commits; detail must never contain secrets."""
    event = AuditEvent(
        action=action,
        actor_id=actor_id,
        workspace_id=workspace_id,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        detail=detail or {},
    )
    db.add(event)
    return event
