"""Práctica de Verb Base Form: mode + practice_enabled.

Revision ID: 016_verb_base_practice
Revises: 015_listening_clips
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "016_verb_base_practice"
down_revision: str | None = "015_listening_clips"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "verb_base_config",
        sa.Column(
            "practice_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "verb_base_attempts",
        sa.Column(
            "mode",
            sa.String(length=16),
            nullable=False,
            server_default="exam",
        ),
    )
    op.create_check_constraint(
        "ck_verb_base_attempt_mode",
        "verb_base_attempts",
        "mode IN ('exam', 'practice')",
    )
    op.create_index(
        "ix_verb_base_attempts_user_mode_status",
        "verb_base_attempts",
        ["user_id", "mode", "status"],
    )

    # Si hubiera más de un intento abierto, deja el más reciente.
    op.execute(
        """
        UPDATE verb_base_attempts AS a
        SET status = 'CANCELLED'
        WHERE a.status = 'IN_PROGRESS'
          AND EXISTS (
            SELECT 1
            FROM verb_base_attempts AS b
            WHERE b.user_id = a.user_id
              AND b.mode = a.mode
              AND b.status = 'IN_PROGRESS'
              AND (
                b.started_at > a.started_at
                OR (b.started_at = a.started_at AND b.id > a.id)
              )
          )
        """
    )
    op.create_unique_constraint(
        "uq_verb_base_attempt_user_mode_number",
        "verb_base_attempts",
        ["user_id", "mode", "attempt_number"],
    )
    op.create_index(
        "uq_verb_base_attempt_open_user_mode",
        "verb_base_attempts",
        ["user_id", "mode"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.execute(
        """
        INSERT INTO exam_access (
            id, user_id, exam_type, is_enabled, practice_enabled, allowed_attempts
        )
        SELECT
            gen_random_uuid(),
            u.id,
            'verb_base_exam',
            false,
            true,
            1
        FROM users u
        WHERE u.role = 'STUDENT'
          AND NOT EXISTS (
            SELECT 1
            FROM exam_access ea
            WHERE ea.user_id = u.id
              AND ea.exam_type = 'verb_base_exam'
          )
        """
    )
    op.execute(
        """
        UPDATE exam_access
        SET practice_enabled = TRUE
        WHERE exam_type = 'verb_base_exam'
        """
    )
    op.execute(
        """
        UPDATE verb_base_config
        SET practice_enabled = TRUE
        WHERE practice_enabled IS DISTINCT FROM TRUE
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE exam_access
        SET practice_enabled = FALSE
        WHERE exam_type = 'verb_base_exam'
        """
    )
    op.drop_index(
        "uq_verb_base_attempt_open_user_mode",
        table_name="verb_base_attempts",
    )
    op.drop_constraint(
        "uq_verb_base_attempt_user_mode_number",
        "verb_base_attempts",
        type_="unique",
    )
    op.drop_index(
        "ix_verb_base_attempts_user_mode_status",
        table_name="verb_base_attempts",
    )
    op.drop_constraint(
        "ck_verb_base_attempt_mode",
        "verb_base_attempts",
        type_="check",
    )
    op.drop_column("verb_base_attempts", "mode")
    op.drop_column("verb_base_config", "practice_enabled")
