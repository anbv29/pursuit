"""Interview captures, quote highlights and experiment reminders."""

import sqlalchemy as sa
from alembic import op

revision = "23ea4b3d5c75"
down_revision = "22d93a2c4b64"
branch_labels = None
depends_on = None


def upgrade():
    for name in ("interview_captures", "experiment_reminders"):
        columns = [
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column(
                "experiment_id",
                sa.Uuid(),
                sa.ForeignKey("experiments.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        ]
        if name == "interview_captures":
            columns.append(sa.Column("transcript", sa.Text(), nullable=False))
        else:
            columns.extend(
                [
                    sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
                    sa.Column("completed_at", sa.DateTime(timezone=True)),
                ]
            )
        op.create_table(name, *columns)
        op.create_index(f"ix_{name}_experiment_id", name, ["experiment_id"])
    op.create_index("ix_reminders_due", "experiment_reminders", ["completed_at", "due_at"])
    op.create_table(
        "interview_highlights",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "capture_id",
            sa.Uuid(),
            sa.ForeignKey("interview_captures.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("evidence_id", sa.Uuid(), sa.ForeignKey("evidence.id", ondelete="SET NULL")),
        sa.CheckConstraint("start_offset >= 0 AND end_offset > start_offset", name="ck_highlight_offsets"),
    )
    op.create_index("ix_interview_highlights_capture_id", "interview_highlights", ["capture_id"])


def downgrade():
    op.drop_table("interview_highlights")
    op.drop_table("experiment_reminders")
    op.drop_table("interview_captures")
