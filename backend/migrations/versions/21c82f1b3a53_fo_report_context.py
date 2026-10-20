"""Save the exact report context consented for Fo conversations."""

import sqlalchemy as sa
from alembic import op

revision = "21c82f1b3a53"
down_revision = "20b71e9a0f42"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("fo_chat_turns", sa.Column("report_context", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("fo_chat_turns", "report_context")
