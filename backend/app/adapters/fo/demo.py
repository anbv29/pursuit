"""Demo adapter: simulates Fo. Every result is flagged simulated=True and labelled."""

from app.adapters.fo.base import FoResult

FAIL_MARKER = "+simulate-failure@"  # e.g. dana+simulate-failure@x.com simulates a provider failure


class DemoFoAdapter:
    mode = "demo"

    def __init__(self) -> None:
        self._seen: dict[str, FoResult] = {}

    def submit(self, instruction: str, idempotency_key: str) -> FoResult:
        if idempotency_key in self._seen:
            return self._seen[idempotency_key]
        if FAIL_MARKER in instruction:
            result = FoResult(
                state="failed",
                summary="[DEMO] Simulated failure: recipient domain does not exist.",
                simulated=True,
            )
        else:
            result = FoResult(
                state="complete",
                summary="[DEMO] Simulated: Fo would carry out this request. Nothing was sent.",
                conversation_ref=f"demo-{idempotency_key[:12]}",
                simulated=True,
            )
        self._seen[idempotency_key] = result
        return result

    def poll(self, conversation_ref: str | None) -> FoResult:
        return FoResult(state="complete", summary="[DEMO] Simulated completion.", simulated=True)

    def health(self) -> dict:
        return {"mode": "demo", "status": "simulated", "detail": "Demo mode: no real actions are performed."}
