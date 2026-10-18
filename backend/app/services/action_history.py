from sqlalchemy import select

from app.models import ActionUpdate


def remember(db, action, state, summary, actor_id=None):
    summary = (summary or "")[:2000]
    last = db.scalar(
        select(ActionUpdate)
        .where(ActionUpdate.action_id == action.id)
        .order_by(ActionUpdate.created_at.desc(), ActionUpdate.id.desc())
        .limit(1)
    )
    if last is None or last.state != state or last.summary != summary:
        db.add(ActionUpdate(action_id=action.id, state=state, summary=summary, actor_id=actor_id))
    action.fo_state = state


def progress(db, action, result):
    action.result_summary = result.summary[:2000]
    if result.conversation_ref:
        action.provider_ref = result.conversation_ref
    remember(db, action, result.state, result.summary)
    db.commit()


def list_updates(db, action):
    return db.scalars(
        select(ActionUpdate)
        .where(ActionUpdate.action_id == action.id)
        .order_by(ActionUpdate.created_at.desc(), ActionUpdate.id.desc())
        .limit(100)
    ).all()
