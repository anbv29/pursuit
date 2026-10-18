import json
import logging

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.services import billing_webhooks, payment_provider

router = APIRouter(tags=["billing webhooks"])
logger = logging.getLogger("pursuit.billing")


@router.post("/api/billing/webhook")
async def webhook(request: Request):
    if not payment_provider.configured():
        raise HTTPException(503, "Billing webhook is not configured.")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 262144:
            raise HTTPException(413, "Webhook exceeds the size limit.")
    event_id = request.headers.get("webhook-id", "")
    if not 1 <= len(event_id) <= 200:
        raise HTTPException(400, "Invalid webhook identifier.")
    try:
        with payment_provider.client() as provider:
            provider.webhooks.unwrap(bytes(body).decode("utf-8"), headers=dict(request.headers))
        event = json.loads(body)
        if (
            not isinstance(event, dict)
            or not isinstance(event.get("data"), dict)
            or not isinstance(event.get("type"), str)
            or len(event["type"]) > 60
        ):
            raise ValueError
    except Exception as exc:
        raise HTTPException(401, "Invalid webhook signature or payload.") from exc
    if event.get("business_id") != get_settings().dodo_business_id:
        raise HTTPException(403, "Webhook business does not match.")
    try:
        return await run_in_threadpool(billing_webhooks.process, event, event_id)
    except Exception as exc:
        logger.error("Billing event %s could not be fulfilled; awaiting provider retry", event_id)
        raise HTTPException(503, "Billing event could not be processed. Please retry.") from exc
