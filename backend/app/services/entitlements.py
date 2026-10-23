"""All product features are free; authentication and rate limits remain enforced.

Legacy payment records stay in the database for history, never as access gates.
"""

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
