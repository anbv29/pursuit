"""Durable report watches and private evidence alerts."""

import sqlalchemy as sa
from alembic import op

revision = "24fb5c4e6d86"
down_revision = "23ea4b3d5c75"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "report_watches",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("snapshots", sa.JSON(), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True)),
        sa.Column("next_check_at", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.String(64)),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_report_watches_due", "report_watches", ["enabled", "next_check_at"])
    op.create_table(
        "watch_alerts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("watch_id", sa.Uuid(), sa.ForeignKey("report_watches.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("dedupe_key", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("watch_id", "dedupe_key", name="uq_watch_alert_receipt"),
    )
    op.create_index("ix_watch_alert_report_created", "watch_alerts", ["report_id", "created_at"])


def downgrade():
    op.drop_table("watch_alerts")
    op.drop_table("report_watches")
