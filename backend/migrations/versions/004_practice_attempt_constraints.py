"""scope Past Simple attempt uniqueness by mode

Revision ID: 004_practice_constraints
Revises: 003_past_simple_practice
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_practice_constraints"
down_revision: str | None = "003_past_simple_practice"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_past_simple_attempt_user_number",
        "past_simple_attempts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_past_simple_attempt_user_mode_number",
        "past_simple_attempts",
        ["user_id", "mode", "attempt_number"],
    )

    op.drop_index(
        "uq_past_simple_attempt_open_per_user",
        table_name="past_simple_attempts",
    )
    op.create_index(
        "uq_past_simple_attempt_open_per_user_mode",
        "past_simple_attempts",
        ["user_id", "mode"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_past_simple_attempt_open_per_user_mode",
        table_name="past_simple_attempts",
    )
    op.create_index(
        "uq_past_simple_attempt_open_per_user",
        "past_simple_attempts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.drop_constraint(
        "uq_past_simple_attempt_user_mode_number",
        "past_simple_attempts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_past_simple_attempt_user_number",
        "past_simple_attempts",
        ["user_id", "attempt_number"],
    )
