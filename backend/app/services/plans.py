"""Public prices and allowances. Provider product IDs never come from the browser."""

PLANS = {
    "free": {
        "name": "Explore",
        "price_cents": 0,
        "interval": "free",
        "reports": 0,
        "questions": 0,
        "seats": 1,
    },
    "single": {
        "name": "Single Report",
        "price_cents": 1500,
        "interval": "once",
        "reports": 1,
        "questions": 10,
        "seats": 1,
    },
    "founder": {
        "name": "Founder",
        "price_cents": 2900,
        "interval": "month",
        "reports": 3,
        "questions": 50,
        "seats": 1,
    },
    "team": {
        "name": "Team",
        "price_cents": 7900,
        "interval": "month",
        "reports": 10,
        "questions": 200,
        "seats": 5,
    },
}
