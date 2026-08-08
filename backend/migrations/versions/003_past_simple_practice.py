"""add Past Simple practice mode and expanded bank support

Revision ID: 003_past_simple_practice
Revises: 002_multi_exam
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_past_simple_practice"
down_revision: str | None = "002_multi_exam"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "past_simple_config",
        sa.Column(
            "practice_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "past_simple_attempts",
        sa.Column(
            "mode",
            sa.String(length=16),
            nullable=False,
            server_default="exam",
        ),
    )
    op.create_check_constraint(
        "ck_past_simple_attempt_mode",
        "past_simple_attempts",
        "mode IN ('exam', 'practice')",
    )
    op.create_index(
        "ix_past_simple_attempts_user_mode_status",
        "past_simple_attempts",
        ["user_id", "mode", "status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_past_simple_attempts_user_mode_status",
        table_name="past_simple_attempts",
    )
    op.drop_constraint(
        "ck_past_simple_attempt_mode",
        "past_simple_attempts",
        type_="check",
    )
    op.drop_column("past_simple_attempts", "mode")
    op.drop_column("past_simple_config", "practice_enabled")
