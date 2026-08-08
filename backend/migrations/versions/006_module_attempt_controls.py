"""practice attempt limits and unified module controls

Revision ID: 006_module_attempt_controls
Revises: 005_exam_access_practice
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006_module_attempt_controls"
down_revision: str | None = "005_exam_access_practice"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exam_access",
        sa.Column(
            "practice_allowed_attempts",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    op.create_check_constraint(
        "ck_exam_access_practice_attempts",
        "exam_access",
        "practice_allowed_attempts >= 1",
    )
    # Preserve current practice usage so students are not suddenly over the limit.
    op.execute(
        """
        UPDATE exam_access AS access
        SET practice_allowed_attempts = GREATEST(
            1,
            COALESCE(
                (
                    SELECT COUNT(*)::int
                    FROM past_simple_attempts AS attempt
                    WHERE attempt.user_id = access.user_id
                      AND attempt.mode = 'practice'
                      AND attempt.status = 'SUBMITTED'
                ),
                0
            )
        )
        WHERE access.exam_type = 'past_simple_exam'
        """
    )


def downgrade() -> None:
    op.drop_constraint("ck_exam_access_practice_attempts", "exam_access", type_="check")
    op.drop_column("exam_access", "practice_allowed_attempts")
