"""Persist private project Fo conversations and their approvals."""

import sqlalchemy as sa
from alembic import op

revision = "19a60f0c8e31"
down_revision = "c8ae940f7d21"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "fo_chat_turns",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("request_key", sa.String(80), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("reply", sa.Text()),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("mode", sa.String(8), nullable=False),
        sa.Column("provider_ref", sa.String(200)),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "user_id", "request_key"),
        sa.CheckConstraint("mode IN ('demo', 'live')"),
        sa.CheckConstraint(
            "status IN ('PENDING_APPROVAL','RUNNING','WORKING','REPLIED','FAILED','UNKNOWN','CANCELLED')"
        ),
    )
    op.create_index("ix_fo_chat_owner", "fo_chat_turns", ["workspace_id", "user_id", "created_at"])


def downgrade():
    op.drop_table("fo_chat_turns")
