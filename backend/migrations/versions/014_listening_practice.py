"""Añade Listening Practice (audio + banco + intentos).

Revision ID: 014_listening_practice
Revises: 013_ps_practice_access
Create Date: 2026-08-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "014_listening_practice"
down_revision: str | None = "013_ps_practice_access"
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
        "'verb_exam', 'verb_base_exam', 'past_simple_exam', "
        "'present_simple_exam', 'present_perfect_exam', 'listening_practice')",
    )

    op.create_table(
        "listening_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "practice_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="10"),
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
        "listening_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stable_key", sa.String(128), nullable=False, unique=True),
        sa.Column(
            "exam_type",
            sa.String(32),
            nullable=False,
            server_default="listening_practice",
        ),
        sa.Column("topic", sa.String(64), nullable=False),
        sa.Column("question_type", sa.String(32), nullable=False),
        sa.Column("instruction", sa.String(255), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("accepted_answers", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("audio_url", sa.String(255), nullable=False),
        sa.Column("clip_key", sa.String(64), nullable=False),
        sa.Column("clip_title", sa.String(128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_listening_questions_topic", "listening_questions", ["topic"])
    op.create_index("ix_listening_questions_clip_key", "listening_questions", ["clip_key"])

    op.create_table(
        "listening_attempts",
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
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("correct_answers", sa.Integer(), nullable=True),
        sa.Column("incorrect_answers", sa.Integer(), nullable=True),
        sa.Column("unanswered_answers", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("score_out_of_ten", sa.Numeric(4, 2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.CheckConstraint("mode IN ('exam', 'practice')", name="ck_listening_attempt_mode"),
        sa.UniqueConstraint(
            "user_id",
            "mode",
            "attempt_number",
            name="uq_listening_attempt_user_mode_num",
        ),
    )
    op.create_index("ix_listening_attempts_user_id", "listening_attempts", ["user_id"])
    op.create_index(
        "uq_listening_attempt_open_per_user_mode",
        "listening_attempts",
        ["user_id", "mode"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.create_table(
        "listening_attempt_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("listening_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("listening_questions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("snapshot_topic", sa.String(64), nullable=False),
        sa.Column("snapshot_question_type", sa.String(32), nullable=False),
        sa.Column("snapshot_instruction", sa.String(255), nullable=False),
        sa.Column("snapshot_question", sa.Text(), nullable=False),
        sa.Column("snapshot_options", postgresql.JSONB(), nullable=True),
        sa.Column("snapshot_correct_answer", sa.Text(), nullable=False),
        sa.Column("snapshot_accepted_answers", postgresql.JSONB(), nullable=False),
        sa.Column("snapshot_explanation", sa.Text(), nullable=False),
        sa.Column("snapshot_points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("snapshot_audio_url", sa.String(255), nullable=False),
        sa.Column("snapshot_clip_title", sa.String(128), nullable=False),
        sa.Column("answer_raw", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("attempt_id", "position", name="uq_listening_attempt_q_pos"),
        sa.UniqueConstraint(
            "attempt_id",
            "source_question_id",
            name="uq_listening_attempt_source_q",
        ),
    )

    op.execute(
        """
        INSERT INTO listening_config (
            id, is_enabled, practice_enabled, question_count,
            passing_percentage, review_policy
        )
        SELECT gen_random_uuid(), false, true, 10, 70, 'FULL'
        WHERE NOT EXISTS (SELECT 1 FROM listening_config)
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
            'listening_practice',
            false,
            true,
            1
        FROM users u
        WHERE u.role = 'STUDENT'
          AND NOT EXISTS (
            SELECT 1
            FROM exam_access ea
            WHERE ea.user_id = u.id
              AND ea.exam_type = 'listening_practice'
          )
        """
    )


def downgrade() -> None:
    op.drop_table("listening_attempt_questions")
    op.drop_index(
        "uq_listening_attempt_open_per_user_mode", table_name="listening_attempts"
    )
    op.drop_index("ix_listening_attempts_user_id", table_name="listening_attempts")
    op.drop_table("listening_attempts")
    op.drop_index("ix_listening_questions_clip_key", table_name="listening_questions")
    op.drop_index("ix_listening_questions_topic", table_name="listening_questions")
    op.drop_table("listening_questions")
    op.drop_table("listening_config")
    op.execute("DELETE FROM exam_access WHERE exam_type = 'listening_practice'")
    op.drop_constraint("ck_exam_access_type", "exam_access", type_="check")
    op.create_check_constraint(
        "ck_exam_access_type",
        "exam_access",
        "exam_type IN ("
        "'verb_exam', 'verb_base_exam', 'past_simple_exam', "
        "'present_simple_exam', 'present_perfect_exam')",
    )
