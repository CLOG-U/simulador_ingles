"""Añade Present Perfect Exam y Practice (banco + intentos).

Revision ID: 011_present_perfect_exam
Revises: 010_present_simple_20_questions
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "011_present_perfect_exam"
down_revision: str | None = "010_present_simple_20_questions"
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
        "'present_simple_exam', 'present_perfect_exam')",
    )

    op.create_table(
        "present_perfect_config",
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
        "present_perfect_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stable_key", sa.String(128), nullable=False, unique=True),
        sa.Column(
            "exam_type",
            sa.String(32),
            nullable=False,
            server_default="present_perfect_exam",
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
    op.create_index(
        "ix_present_perfect_questions_topic", "present_perfect_questions", ["topic"]
    )

    op.create_table(
        "present_perfect_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mode", sa.String(16), nullable=False, server_default="exam"),
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
        sa.Column("score_out_of_ten", sa.Numeric(4, 2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.CheckConstraint(
            "mode IN ('exam', 'practice')", name="ck_present_perfect_attempt_mode"
        ),
    )
    op.create_index(
        "ix_present_perfect_attempts_user_id", "present_perfect_attempts", ["user_id"]
    )

    op.create_table(
        "present_perfect_attempt_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("present_perfect_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("present_perfect_questions.id", ondelete="SET NULL"),
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
        sa.Column("answer_raw", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "attempt_id", "position", name="uq_present_perfect_attempt_q_pos"
        ),
        sa.UniqueConstraint(
            "attempt_id",
            "source_question_id",
            name="uq_present_perfect_attempt_source_q",
        ),
    )

    op.execute(
        """
        INSERT INTO present_perfect_config (
            id, is_enabled, practice_enabled, question_count,
            passing_percentage, review_policy
        )
        SELECT gen_random_uuid(), false, true, 20, 70, 'FULL'
        WHERE NOT EXISTS (SELECT 1 FROM present_perfect_config)
        """
    )


def downgrade() -> None:
    op.drop_table("present_perfect_attempt_questions")
    op.drop_index("ix_present_perfect_attempts_user_id", table_name="present_perfect_attempts")
    op.drop_table("present_perfect_attempts")
    op.drop_index("ix_present_perfect_questions_topic", table_name="present_perfect_questions")
    op.drop_table("present_perfect_questions")
    op.drop_table("present_perfect_config")

    op.drop_constraint("ck_exam_access_type", "exam_access", type_="check")
    op.create_check_constraint(
        "ck_exam_access_type",
        "exam_access",
        "exam_type IN ("
        "'verb_exam', 'verb_base_exam', 'past_simple_exam', 'present_simple_exam')",
    )
