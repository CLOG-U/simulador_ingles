"""Práctica de Verb Past Form: tablas + acceso.

Revision ID: 018_verb_past_practice
Revises: 017_listening_exam
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "018_verb_past_practice"
down_revision: str | None = "017_listening_exam"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    review_policy = postgresql.ENUM(
        "FULL",
        "SCORE_ONLY",
        "AFTER_CLOSE",
        name="review_policy",
        create_type=False,
    )
    attempt_status = postgresql.ENUM(
        "IN_PROGRESS",
        "SUBMITTED",
        "EXPIRED",
        "CANCELLED",
        name="attempt_status",
        create_type=False,
    )

    op.drop_constraint("ck_exam_access_type", "exam_access", type_="check")
    op.create_check_constraint(
        "ck_exam_access_type",
        "exam_access",
        "exam_type IN ("
        "'verb_exam', 'verb_base_exam', 'verb_past_exam', 'past_simple_exam', "
        "'present_simple_exam', 'present_perfect_exam', 'listening_practice')",
    )

    op.create_table(
        "verb_past_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "practice_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("passing_percentage", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("review_policy", review_policy, nullable=False, server_default="FULL"),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "verb_past_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mode", sa.String(16), nullable=False, server_default="practice"),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("config_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("status", attempt_status, nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("correct_answers", sa.Integer(), nullable=True),
        sa.Column("incorrect_answers", sa.Integer(), nullable=True),
        sa.Column("unanswered_answers", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.CheckConstraint("mode IN ('exam', 'practice')", name="ck_verb_past_attempt_mode"),
    )
    op.create_index("ix_verb_past_attempts_user_id", "verb_past_attempts", ["user_id"])
    op.create_index(
        "ix_verb_past_attempts_user_mode_status",
        "verb_past_attempts",
        ["user_id", "mode", "status"],
    )
    op.create_unique_constraint(
        "uq_verb_past_attempt_user_mode_number",
        "verb_past_attempts",
        ["user_id", "mode", "attempt_number"],
    )
    op.create_index(
        "uq_verb_past_attempt_open_user_mode",
        "verb_past_attempts",
        ["user_id", "mode"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.create_table(
        "verb_past_attempt_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("verb_past_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("verb_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_base", sa.String(128), nullable=False),
        sa.Column("snapshot_past", sa.String(128), nullable=False),
        sa.Column("snapshot_spanish_prompt", sa.String(255), nullable=False),
        sa.Column("snapshot_valid_past_answers", postgresql.JSONB(), nullable=False),
        sa.Column("prompt_type", sa.String(32), nullable=False),
        sa.Column("answer_past_raw", sa.Text(), nullable=True),
        sa.Column("is_past_correct", sa.Boolean(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "attempt_id", "position", name="uq_verb_past_attempt_question_position"
        ),
        sa.UniqueConstraint(
            "attempt_id", "verb_id", name="uq_verb_past_attempt_question_verb"
        ),
    )

    op.execute(
        """
        INSERT INTO verb_past_config (
            id, is_enabled, practice_enabled, question_count, passing_percentage, review_policy
        )
        SELECT gen_random_uuid(), false, true, 20, 70, 'FULL'
        WHERE NOT EXISTS (SELECT 1 FROM verb_past_config)
        """
    )
    op.execute(
        """
        INSERT INTO exam_access (
            id, user_id, exam_type, is_enabled, practice_enabled, allowed_attempts
        )
        SELECT
            gen_random_uuid(),
            u.id,
            'verb_past_exam',
            false,
            true,
            1
        FROM users u
        WHERE u.role = 'STUDENT'
          AND NOT EXISTS (
            SELECT 1
            FROM exam_access ea
            WHERE ea.user_id = u.id
              AND ea.exam_type = 'verb_past_exam'
          )
        """
    )


def downgrade() -> None:
    op.drop_table("verb_past_attempt_questions")
    op.drop_index("uq_verb_past_attempt_open_user_mode", table_name="verb_past_attempts")
    op.drop_constraint(
        "uq_verb_past_attempt_user_mode_number",
        "verb_past_attempts",
        type_="unique",
    )
    op.drop_index("ix_verb_past_attempts_user_mode_status", table_name="verb_past_attempts")
    op.drop_index("ix_verb_past_attempts_user_id", table_name="verb_past_attempts")
    op.drop_table("verb_past_attempts")
    op.drop_table("verb_past_config")
    op.execute("DELETE FROM exam_access WHERE exam_type = 'verb_past_exam'")
    op.drop_constraint("ck_exam_access_type", "exam_access", type_="check")
    op.create_check_constraint(
        "ck_exam_access_type",
        "exam_access",
        "exam_type IN ("
        "'verb_exam', 'verb_base_exam', 'past_simple_exam', "
        "'present_simple_exam', 'present_perfect_exam', 'listening_practice')",
    )
