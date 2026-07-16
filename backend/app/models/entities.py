import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import (
    AttemptStatus,
    PromptType,
    ReviewPolicy,
    UserRole,
    VerbAnswerField,
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    username_normalized: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(back_populates="user")
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="user")


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    device_info: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user: Mapped["User"] = relationship(back_populates="refresh_sessions")


class Verb(Base):
    __tablename__ = "verbs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_order: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    base_display: Mapped[str] = mapped_column(String(128), nullable=False)
    past_display: Mapped[str] = mapped_column(String(128), nullable=False)
    spanish_display: Mapped[str] = mapped_column(String(255), nullable=False)
    spanish_prompt: Mapped[str] = mapped_column(String(255), nullable=False)
    hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    answers: Mapped[list["VerbAnswer"]] = relationship(
        back_populates="verb", cascade="all, delete-orphan"
    )


class VerbAnswer(Base):
    __tablename__ = "verb_answers"
    __table_args__ = (
        UniqueConstraint("verb_id", "field", "normalized_value", name="uq_verb_answer_normalized"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verb_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("verbs.id", ondelete="CASCADE"), nullable=False
    )
    field: Mapped[VerbAnswerField] = mapped_column(
        Enum(VerbAnswerField, name="verb_answer_field"), nullable=False
    )
    display_value: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_value: Mapped[str] = mapped_column(String(255), nullable=False)

    verb: Mapped["Verb"] = relationship(back_populates="answers")


class ExamConfig(Base):
    __tablename__ = "exam_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_count: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy"), default=ReviewPolicy.FULL, nullable=False
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status"),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    correct_fields: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_fields: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    fully_correct_questions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="attempts")
    questions: Mapped[list["AttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class AttemptQuestion(Base):
    __tablename__ = "attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_attempt_question_position"),
        UniqueConstraint("attempt_id", "verb_id", name="uq_attempt_question_verb"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    verb_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    snapshot_base: Mapped[str] = mapped_column(String(128), nullable=False)
    snapshot_past: Mapped[str] = mapped_column(String(128), nullable=False)
    snapshot_spanish: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_spanish_prompt: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_valid_answers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    prompt_type: Mapped[PromptType] = mapped_column(
        Enum(PromptType, name="prompt_type"), nullable=False
    )
    answer_base_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_past_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_spanish_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_base_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_past_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_spanish_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["Attempt"] = relationship(back_populates="questions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
