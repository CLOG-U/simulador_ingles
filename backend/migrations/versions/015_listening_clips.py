"""Sesiones de listening por clip.

Revision ID: 015_listening_clips
Revises: 014_listening_practice
Create Date: 2026-08-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "015_listening_clips"
down_revision: str | None = "014_listening_practice"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "listening_attempts",
        sa.Column("clip_key", sa.String(64), nullable=True),
    )
    op.execute(
        """
        UPDATE listening_attempts AS a
        SET clip_key = COALESCE(
            (
                SELECT q.clip_key
                FROM listening_attempt_questions AS aq
                JOIN listening_questions AS q ON q.id = aq.source_question_id
                WHERE aq.attempt_id = a.id
                ORDER BY aq.position
                LIMIT 1
            ),
            'leo-manta'
        )
        """
    )
    op.alter_column(
        "listening_attempts",
        "clip_key",
        existing_type=sa.String(64),
        nullable=False,
        server_default="leo-manta",
    )
    op.drop_constraint(
        "uq_listening_attempt_user_mode_num",
        "listening_attempts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_listening_attempt_user_mode_clip_num",
        "listening_attempts",
        ["user_id", "mode", "clip_key", "attempt_number"],
    )
    op.drop_index(
        "uq_listening_attempt_open_per_user_mode",
        table_name="listening_attempts",
    )
    op.create_index(
        "uq_listening_attempt_open_user_mode_clip",
        "listening_attempts",
        ["user_id", "mode", "clip_key"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_listening_attempt_open_user_mode_clip",
        table_name="listening_attempts",
    )
    op.create_index(
        "uq_listening_attempt_open_per_user_mode",
        "listening_attempts",
        ["user_id", "mode"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )
    op.drop_constraint(
        "uq_listening_attempt_user_mode_clip_num",
        "listening_attempts",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_listening_attempt_user_mode_num",
        "listening_attempts",
        ["user_id", "mode", "attempt_number"],
    )
    op.drop_column("listening_attempts", "clip_key")
