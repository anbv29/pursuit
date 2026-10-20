"""Public prices and allowances. Provider product IDs never come from the browser."""

PLANS = {
    "free": {
        "name": "Explore",
        "first_looks": 1,
        "price_cents": 0,
        "interval": "free",
        "reports": 0,
        "questions": 0,
        "seats": 1,
    },
    "single": {
        "name": "Single Report",
        "price_cents": 499,
        "interval": "once",
        "reports": 1,
        "questions": 10,
        "seats": 1,
    },
    "founder": {
        "name": "Founder",
        "price_cents": 1199,
        "interval": "month",
        "reports": 3,
        "questions": 50,
        "seats": 1,
    },
    "team": {
        "name": "Team",
        "price_cents": 3499,
        "interval": "month",
        "reports": 10,
        "questions": 200,
        "seats": 5,
    },
}
