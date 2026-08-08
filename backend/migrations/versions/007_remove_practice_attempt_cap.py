"""remove practice attempt cap; practice stays unlimited with counter only

Revision ID: 007_remove_practice_cap
Revises: 006_module_attempt_controls
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_remove_practice_cap"
down_revision: str | None = "006_module_attempt_controls"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_exam_access_practice_attempts", "exam_access", type_="check")
    op.drop_column("exam_access", "practice_allowed_attempts")


def downgrade() -> None:
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
