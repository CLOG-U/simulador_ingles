"""add independent Past Simple exam support

Revision ID: 002_multi_exam
Revises: 001_initial
Create Date: 2026-08-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_multi_exam"
down_revision: str | None = "001_initial"
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

    op.add_column(
        "exam_config",
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "exam_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("exam_type", sa.String(32), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("allowed_attempts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
        sa.UniqueConstraint("user_id", "exam_type", name="uq_exam_access_user_type"),
        sa.CheckConstraint(
            "exam_type IN ('verb_exam', 'past_simple_exam')",
            name="ck_exam_access_type",
        ),
        sa.CheckConstraint(
            "allowed_attempts >= 1",
            name="ck_exam_access_attempts",
        ),
    )

    op.execute(
        """
        INSERT INTO exam_access
            (id, user_id, exam_type, is_enabled, allowed_attempts)
        SELECT
            gen_random_uuid(),
            users.id,
            'verb_exam',
            TRUE,
            COALESCE((SELECT max_attempts FROM exam_config LIMIT 1), 1)
        FROM users
        WHERE users.role = 'STUDENT'
        """
    )
    op.execute(
        """
        INSERT INTO exam_access
            (id, user_id, exam_type, is_enabled, allowed_attempts)
        SELECT gen_random_uuid(), users.id, 'past_simple_exam', FALSE, 1
        FROM users
        WHERE users.role = 'STUDENT'
        """
    )

    op.create_table(
        "past_simple_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="24"),
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
        "past_simple_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stable_key", sa.String(128), nullable=False, unique=True),
        sa.Column(
            "exam_type",
            sa.String(32),
            nullable=False,
            server_default="past_simple_exam",
        ),
        sa.Column("topic", sa.String(64), nullable=False),
        sa.Column("question_type", sa.String(32), nullable=False),
        sa.Column("instruction", sa.String(255), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column(
            "accepted_answers",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
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
        "ix_past_simple_questions_topic_active",
        "past_simple_questions",
        ["topic", "active"],
    )

    op.create_table(
        "past_simple_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("config_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("status", attempt_status, nullable=False, server_default="IN_PROGRESS"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("correct_answers", sa.Integer(), nullable=True),
        sa.Column("incorrect_answers", sa.Integer(), nullable=True),
        sa.Column("unanswered_answers", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("score_out_of_ten", sa.Numeric(4, 2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.UniqueConstraint(
            "user_id",
            "attempt_number",
            name="uq_past_simple_attempt_user_number",
        ),
    )
    op.create_index(
        "uq_past_simple_attempt_open_per_user",
        "past_simple_attempts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.create_table(
        "past_simple_attempt_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("past_simple_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("past_simple_questions.id", ondelete="SET NULL"),
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
            "attempt_id",
            "position",
            name="uq_past_attempt_question_position",
        ),
        sa.UniqueConstraint(
            "attempt_id",
            "source_question_id",
            name="uq_past_attempt_source_question",
        ),
    )


def downgrade() -> None:
    op.drop_table("past_simple_attempt_questions")
    op.drop_index(
        "uq_past_simple_attempt_open_per_user",
        table_name="past_simple_attempts",
    )
    op.drop_table("past_simple_attempts")
    op.drop_index(
        "ix_past_simple_questions_topic_active",
        table_name="past_simple_questions",
    )
    op.drop_table("past_simple_questions")
    op.drop_table("past_simple_config")
    op.drop_table("exam_access")
    op.drop_column("exam_config", "is_enabled")
