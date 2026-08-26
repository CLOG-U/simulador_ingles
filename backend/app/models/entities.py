import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
    exam_accesses: Mapped[list["ExamAccess"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="ExamAccess.user_id",
    )
    past_simple_attempts: Mapped[list["PastSimpleAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    present_simple_attempts: Mapped[list["PresentSimpleAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    present_perfect_attempts: Mapped[list["PresentPerfectAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    verb_base_attempts: Mapped[list["VerbBaseAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    listening_attempts: Mapped[list["ListeningAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


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
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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


class ExamAccess(Base):
    __tablename__ = "exam_access"
    __table_args__ = (
        UniqueConstraint("user_id", "exam_type", name="uq_exam_access_user_type"),
        CheckConstraint(
            "exam_type IN ("
            "'verb_exam', 'verb_base_exam', 'past_simple_exam', "
            "'present_simple_exam', 'present_perfect_exam', 'listening_practice'"
            ")",
            name="ck_exam_access_type",
        ),
        CheckConstraint("allowed_attempts >= 1", name="ck_exam_access_attempts"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_type: Mapped[str] = mapped_column(String(32), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allowed_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="exam_accesses", foreign_keys=[user_id])


class PastSimpleConfig(Base):
    __tablename__ = "past_simple_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy", create_type=False),
        default=ReviewPolicy.FULL,
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PastSimpleQuestion(Base):
    __tablename__ = "past_simple_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stable_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(
        String(32), default="past_simple_exam", nullable=False
    )
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_answers: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PastSimpleAttempt(Base):
    __tablename__ = "past_simple_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('exam', 'practice')", name="ck_past_simple_attempt_mode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(16), default="exam", nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", create_type=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unanswered_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_out_of_ten: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="past_simple_attempts")
    questions: Mapped[list["PastSimpleAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class PastSimpleAttemptQuestion(Base):
    __tablename__ = "past_simple_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_past_attempt_question_position"),
        UniqueConstraint(
            "attempt_id", "source_question_id", name="uq_past_attempt_source_question"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("past_simple_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("past_simple_questions.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_topic: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_question: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    snapshot_correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_accepted_answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    snapshot_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    answer_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["PastSimpleAttempt"] = relationship(back_populates="questions")


class PresentSimpleConfig(Base):
    __tablename__ = "present_simple_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy", create_type=False),
        default=ReviewPolicy.FULL,
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PresentSimpleQuestion(Base):
    __tablename__ = "present_simple_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stable_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(
        String(32), default="present_simple_exam", nullable=False
    )
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_answers: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PresentSimpleAttempt(Base):
    __tablename__ = "present_simple_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('exam', 'practice')", name="ck_present_simple_attempt_mode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(16), default="exam", nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", create_type=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unanswered_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_out_of_ten: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="present_simple_attempts")
    questions: Mapped[list["PresentSimpleAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class PresentSimpleAttemptQuestion(Base):
    __tablename__ = "present_simple_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_present_attempt_question_position"),
        UniqueConstraint(
            "attempt_id", "source_question_id", name="uq_present_attempt_source_question"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("present_simple_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("present_simple_questions.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_topic: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_question: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    snapshot_correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_accepted_answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    snapshot_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    answer_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["PresentSimpleAttempt"] = relationship(back_populates="questions")


class PresentPerfectConfig(Base):
    __tablename__ = "present_perfect_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy", create_type=False),
        default=ReviewPolicy.FULL,
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PresentPerfectQuestion(Base):
    __tablename__ = "present_perfect_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stable_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(
        String(32), default="present_perfect_exam", nullable=False
    )
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_answers: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PresentPerfectAttempt(Base):
    __tablename__ = "present_perfect_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('exam', 'practice')", name="ck_present_perfect_attempt_mode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(16), default="exam", nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", create_type=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unanswered_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_out_of_ten: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="present_perfect_attempts")
    questions: Mapped[list["PresentPerfectAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class PresentPerfectAttemptQuestion(Base):
    __tablename__ = "present_perfect_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_present_perfect_attempt_q_pos"),
        UniqueConstraint(
            "attempt_id", "source_question_id", name="uq_present_perfect_attempt_source_q"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("present_perfect_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("present_perfect_questions.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_topic: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_question: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    snapshot_correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_accepted_answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    snapshot_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    answer_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["PresentPerfectAttempt"] = relationship(back_populates="questions")


class ListeningConfig(Base):
    __tablename__ = "listening_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    practice_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy", create_type=False),
        default=ReviewPolicy.FULL,
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ListeningQuestion(Base):
    __tablename__ = "listening_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stable_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    exam_type: Mapped[str] = mapped_column(
        String(32), default="listening_practice", nullable=False
    )
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_answers: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    audio_url: Mapped[str] = mapped_column(String(255), nullable=False)
    clip_key: Mapped[str] = mapped_column(String(64), nullable=False)
    clip_title: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ListeningAttempt(Base):
    __tablename__ = "listening_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('exam', 'practice')", name="ck_listening_attempt_mode"),
        UniqueConstraint(
            "user_id", "mode", "attempt_number", name="uq_listening_attempt_user_mode_num"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(16), default="practice", nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", create_type=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unanswered_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    score_out_of_ten: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="listening_attempts")
    questions: Mapped[list["ListeningAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class ListeningAttemptQuestion(Base):
    __tablename__ = "listening_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_listening_attempt_q_pos"),
        UniqueConstraint(
            "attempt_id", "source_question_id", name="uq_listening_attempt_source_q"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listening_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listening_questions.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_topic: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_instruction: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_question: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    snapshot_correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_accepted_answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    snapshot_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    snapshot_audio_url: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_clip_title: Mapped[str] = mapped_column(String(128), nullable=False)
    answer_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["ListeningAttempt"] = relationship(back_populates="questions")


class VerbBaseConfig(Base):
    __tablename__ = "verb_base_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    passing_percentage: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_policy: Mapped[ReviewPolicy] = mapped_column(
        Enum(ReviewPolicy, name="review_policy", create_type=False),
        default=ReviewPolicy.FULL,
        nullable=False,
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class VerbBaseAttempt(Base):
    __tablename__ = "verb_base_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    config_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", create_type=False),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    incorrect_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unanswered_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    user: Mapped["User"] = relationship(back_populates="verb_base_attempts")
    questions: Mapped[list["VerbBaseAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class VerbBaseAttemptQuestion(Base):
    __tablename__ = "verb_base_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_verb_base_attempt_question_position"),
        UniqueConstraint("attempt_id", "verb_id", name="uq_verb_base_attempt_question_verb"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verb_base_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    verb_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    snapshot_base: Mapped[str] = mapped_column(String(128), nullable=False)
    snapshot_past: Mapped[str] = mapped_column(String(128), nullable=False)
    snapshot_spanish_prompt: Mapped[str] = mapped_column(String(255), nullable=False)
    snapshot_valid_base_answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    prompt_type: Mapped[str] = mapped_column(String(32), nullable=False)
    answer_base_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_base_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["VerbBaseAttempt"] = relationship(back_populates="questions")


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
