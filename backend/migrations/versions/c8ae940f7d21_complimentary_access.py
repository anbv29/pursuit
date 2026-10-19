"""Separate operator access grants from paid subscriptions."""

import sqlalchemy as sa
from alembic import op

revision = "c8ae940f7d21"
down_revision = "7dd1f0193ee9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "complimentary_access",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("reason", sa.String(240), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.CheckConstraint("plan IN ('founder', 'team')"),
    )


def downgrade():
    op.drop_table("complimentary_access")
