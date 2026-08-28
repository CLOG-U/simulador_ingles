"""Listening Exam 1: 22 preguntas por intento.

Revision ID: 017_listening_exam
Revises: 016_verb_base_practice
Create Date: 2026-08-28
"""

from collections.abc import Sequence

from alembic import op

revision: str = "017_listening_exam"
down_revision: str | None = "016_verb_base_practice"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE listening_config
        SET question_count = 22
        WHERE question_count = 10
        """
    )
    op.alter_column(
        "listening_config",
        "question_count",
        server_default="22",
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE listening_config
        SET question_count = 10
        WHERE question_count = 22
        """
    )
    op.alter_column(
        "listening_config",
        "question_count",
        server_default="10",
    )
