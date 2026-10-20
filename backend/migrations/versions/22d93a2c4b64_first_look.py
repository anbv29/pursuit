"""Account-scoped free website first look."""

import sqlalchemy as sa
from alembic import op

revision = "22d93a2c4b64"
down_revision = "21c82f1b3a53"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "first_looks",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id", ondelete="SET NULL")),
        sa.Column("experiment_id", sa.Uuid(), sa.ForeignKey("experiments.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("company_url", sa.String(2048), nullable=False),
        sa.Column("audience", sa.String(300), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("result", sa.JSON()),
        sa.Column("error", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('RUNNING','SUCCEEDED','FAILED')"),
    )


def downgrade():
    op.drop_table("first_looks")
