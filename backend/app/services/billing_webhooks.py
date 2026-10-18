from sqlalchemy.dialects.postgresql import insert

from app.core.db import new_session
from app.models import BillingEvent
from app.services import billing_fulfillment, payment_provider


def process(event, event_id):
    with new_session() as db:
        claimed = db.execute(
            insert(BillingEvent)
            .values(event_id=event_id, event_type=event["type"])
            .on_conflict_do_nothing(index_elements=[BillingEvent.event_id])
            .returning(BillingEvent.event_id)
        ).scalar()
        if not claimed:
            return {"received": True, "duplicate": True}
        kind, data = event["type"], event["data"]
        with payment_provider.client() as provider:
            if kind in ("payment.succeeded", "payment.failed", "payment.cancelled"):
                billing_fulfillment.payment(db, provider, data["payment_id"])
            elif kind.startswith("subscription."):
                billing_fulfillment.subscription(db, provider, data["subscription_id"])
            elif kind == "refund.succeeded":
                refund = provider.refunds.retrieve(data["refund_id"])
                if refund.status == "succeeded":
                    billing_fulfillment.revoke(db, provider, refund.payment_id)
            elif kind in ("dispute.opened", "dispute.lost", "dispute.accepted", "dispute.expired"):
                billing_fulfillment.revoke(db, provider, data["payment_id"])
        # Event claim and all allowance writes commit together, or roll back together.
        db.commit()
        return {"received": True, "duplicate": False}
