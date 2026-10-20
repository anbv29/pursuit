"""Shared public catalogue; checkout still validates prices server-side."""

import json
from pathlib import Path

PLANS = json.loads(Path(__file__).with_name("plan_catalog.json").read_text(encoding="utf-8"))
