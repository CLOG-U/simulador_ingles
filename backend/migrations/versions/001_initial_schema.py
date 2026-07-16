"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-07-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = postgresql.ENUM("ADMIN", "STUDENT", name="user_role", create_type=False)
    verb_answer_field = postgresql.ENUM("BASE", "PAST", "SPANISH", name="verb_answer_field", create_type=False)
    review_policy = postgresql.ENUM("FULL", "SCORE_ONLY", "AFTER_CLOSE", name="review_policy", create_type=False)
    attempt_status = postgresql.ENUM(
        "IN_PROGRESS", "SUBMITTED", "EXPIRED", "CANCELLED", name="attempt_status", create_type=False
    )
    prompt_type = postgresql.ENUM("FROM_SPANISH", "FROM_BASE", "FROM_PAST", name="prompt_type", create_type=False)

    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    verb_answer_field.create(bind, checkfirst=True)
    review_policy.create(bind, checkfirst=True)
    attempt_status.create(bind, checkfirst=True)
    prompt_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("username_normalized", sa.String(64), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "verbs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_order", sa.Integer(), nullable=False, unique=True),
        sa.Column("base_display", sa.String(128), nullable=False),
        sa.Column("past_display", sa.String(128), nullable=False),
        sa.Column("spanish_display", sa.String(255), nullable=False),
        sa.Column("spanish_prompt", sa.String(255), nullable=False),
        sa.Column("hint", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "refresh_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("device_info", sa.String(512), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
    )

    op.create_table(
        "verb_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("verb_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("verbs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field", verb_answer_field, nullable=False),
        sa.Column("display_value", sa.String(255), nullable=False),
        sa.Column("normalized_value", sa.String(255), nullable=False),
        sa.UniqueConstraint("verb_id", "field", "normalized_value", name="uq_verb_answer_normalized"),
    )

    op.create_table(
        "exam_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("passing_percentage", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("review_policy", review_policy, nullable=False, server_default="FULL"),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("config_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("status", attempt_status, nullable=False, server_default="IN_PROGRESS"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("correct_fields", sa.Integer(), nullable=True),
        sa.Column("total_fields", sa.Integer(), nullable=False, server_default="40"),
        sa.Column("fully_correct_questions", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
    )

    op.create_index(
        "uq_attempt_open_per_user",
        "attempts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS'"),
    )

    op.create_table(
        "attempt_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("verb_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_base", sa.String(128), nullable=False),
        sa.Column("snapshot_past", sa.String(128), nullable=False),
        sa.Column("snapshot_spanish", sa.String(255), nullable=False),
        sa.Column("snapshot_spanish_prompt", sa.String(255), nullable=False),
        sa.Column("snapshot_valid_answers", postgresql.JSONB(), nullable=False),
        sa.Column("prompt_type", prompt_type, nullable=False),
        sa.Column("answer_base_raw", sa.Text(), nullable=True),
        sa.Column("answer_past_raw", sa.Text(), nullable=True),
        sa.Column("answer_spanish_raw", sa.Text(), nullable=True),
        sa.Column("is_base_correct", sa.Boolean(), nullable=True),
        sa.Column("is_past_correct", sa.Boolean(), nullable=True),
        sa.Column("is_spanish_correct", sa.Boolean(), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("attempt_id", "position", name="uq_attempt_question_position"),
        sa.UniqueConstraint("attempt_id", "verb_id", name="uq_attempt_question_verb"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("target_type", sa.String(64), nullable=True),
        sa.Column("target_id", sa.String(64), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("attempt_questions")
    op.drop_index("uq_attempt_open_per_user", table_name="attempts")
    op.drop_table("attempts")
    op.drop_table("exam_config")
    op.drop_table("verb_answers")
    op.drop_table("refresh_sessions")
    op.drop_table("verbs")
    op.drop_table("users")

    bind = op.get_bind()
    for enum_name in ("prompt_type", "attempt_status", "review_policy", "verb_answer_field", "user_role"):
        postgresql.ENUM(name=enum_name).drop(bind, checkfirst=True)
