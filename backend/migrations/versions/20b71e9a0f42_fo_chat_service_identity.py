"""Bind each live conversation to its dedicated service identity."""

import sqlalchemy as sa
from alembic import op

revision = "20b71e9a0f42"
down_revision = "19a60f0c8e31"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("fo_chat_turns", sa.Column("service_user_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_fo_chat_service_user", "fo_chat_turns", "users", ["service_user_id"], ["id"], ondelete="SET NULL"
    )


def downgrade():
    op.drop_constraint("fk_fo_chat_service_user", "fo_chat_turns", type_="foreignkey")
    op.drop_column("fo_chat_turns", "service_user_id")
