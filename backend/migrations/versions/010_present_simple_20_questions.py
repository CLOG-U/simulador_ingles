"""Sube Present Simple a 20 preguntas por intento.

Revision ID: 010_present_simple_20_questions
Revises: 009_verb_base_present_simple
Create Date: 2026-08-20
"""

from typing import Sequence, Union

from alembic import op

revision: str = "010_present_simple_20_questions"
down_revision: Union[str, None] = "009_verb_base_present_simple"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE present_simple_config
        SET question_count = 20
        WHERE question_count = 14
        """
    )
    op.alter_column(
        "present_simple_config",
        "question_count",
        server_default="20",
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE present_simple_config
        SET question_count = 14
        WHERE question_count = 20
        """
    )
    op.alter_column(
        "present_simple_config",
        "question_count",
        server_default="14",
    )
