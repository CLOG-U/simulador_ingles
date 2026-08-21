"""Habilita acceso de práctica Present Simple para estudiantes existentes.

Revision ID: 013_ps_practice_access
Revises: 012_pp_practice_access
Create Date: 2026-08-21
"""

from collections.abc import Sequence

from alembic import op

revision: str = "013_ps_practice_access"
down_revision: str | None = "012_pp_practice_access"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Crear fila de acceso Present Simple para estudiantes que aún no la tienen.
    op.execute(
        """
        INSERT INTO exam_access (
            id, user_id, exam_type, is_enabled, practice_enabled, allowed_attempts
        )
        SELECT
            gen_random_uuid(),
            u.id,
            'present_simple_exam',
            false,
            true,
            1
        FROM users u
        WHERE u.role = 'STUDENT'
          AND NOT EXISTS (
            SELECT 1
            FROM exam_access ea
            WHERE ea.user_id = u.id
              AND ea.exam_type = 'present_simple_exam'
          )
        """
    )
    # Misma idea que Past Simple (005) y Present Perfect (012).
    op.execute(
        """
        UPDATE exam_access
        SET practice_enabled = TRUE
        WHERE exam_type = 'present_simple_exam'
        """
    )
    op.execute(
        """
        UPDATE present_simple_config
        SET practice_enabled = TRUE
        WHERE practice_enabled IS DISTINCT FROM TRUE
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE exam_access
        SET practice_enabled = FALSE
        WHERE exam_type = 'present_simple_exam'
        """
    )
