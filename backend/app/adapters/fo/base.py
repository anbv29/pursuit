"""Fo adapter interface.

Fo (Wajo) exposes a natural-language MCP tool, `ask_fo`, that performs real-world
actions from the user's Wajo account, plus `get_fo_reply` to poll long-running
turns. There are no typed "send email" endpoints, so Pursuit:

1. builds a narrow, deterministic instruction from validated fields (never raw
   model output),
2. submits it only after human approval,
3. treats Fo's free-text completion as *reported*, not verified: live results
   land in UNKNOWN until a human confirms the outcome.
"""

from dataclasses import dataclass, field
from typing import Literal, Protocol

FoState = Literal["working", "complete", "failed", "needs_input"]


@dataclass
class FoResult:
    state: FoState
    summary: str = ""
    conversation_ref: str | None = None
    simulated: bool = False
    extra: dict = field(default_factory=dict)


class FoUnavailable(Exception):
    """Credentials missing/revoked, provider down, or rate limited. Never a success."""


class FoAdapter(Protocol):
    mode: Literal["demo", "live"]

    def submit(self, instruction: str, idempotency_key: str) -> FoResult: ...

    def poll(self, conversation_ref: str | None) -> FoResult: ...

    def health(self) -> dict: ...
