"""independent practice access per student

Revision ID: 005_exam_access_practice
Revises: 004_practice_constraints
Create Date: 2026-08-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_exam_access_practice"
down_revision: str | None = "004_practice_constraints"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "exam_access",
        sa.Column(
            "practice_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Existing students with Past Simple exam access can keep practicing.
    op.execute(
        """
        UPDATE exam_access
        SET practice_enabled = TRUE
        WHERE exam_type = 'past_simple_exam' AND is_enabled = TRUE
        """
    )


def downgrade() -> None:
    op.drop_column("exam_access", "practice_enabled")
