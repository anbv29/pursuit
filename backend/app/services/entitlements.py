"""All product features are free; authentication and rate limits remain enforced.

Legacy payment records stay in the database for history, never as access gates.
"""

from contextlib import contextmanager

PLANS = {"free": {"seats": 25}}


def plan(db, workspace_id):
    return "free"


def eligible_grants(db, workspace_id):
    return []


def require_feature(db, workspace_id):
    return None


def reserve(db, workspace_id, kind, resource_key=None):
    return None


def finish(db, use_id, success):
    return None


@contextmanager
def metered(db, workspace_id, kind):
    yield None


def summary(db, workspace_id):
    return {
        "plan": "free",
        "seats": 25,
        "research_remaining": None,
        "questions_remaining": None,
        "advanced_research": True,
        "complimentary": False,
        "allowance_resets_at": None,
        "note": "All features are free. Fair-use and provider capacity limits apply.",
    }
