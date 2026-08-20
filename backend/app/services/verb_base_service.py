"""Examen Verb Base Form: solo español ↔ forma base en inglés (sin pasado)."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import (
    AttemptStatus,
    BaseFormPromptType,
    ExamType,
    User,
    Verb,
    VerbAnswer,
    VerbAnswerField,
    VerbBaseAttempt,
    VerbBaseAttemptQuestion,
    VerbBaseConfig,
)
from app.services import exam_access_service
from app.services.normalization import normalize_spanish, normalize_text


PROMPT_LABELS = {
    BaseFormPromptType.FROM_SPANISH.value: "Spanish",
    BaseFormPromptType.FROM_BASE.value: "base form in English",
}


async def get_config(session: AsyncSession) -> VerbBaseConfig:
    result = await session.execute(select(VerbBaseConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        raise AppError(
            "CONFIG_MISSING",
            "Configuración de Verb Base Form no encontrada.",
            status_code=500,
        )
    return config


async def get_visible_config(session: AsyncSession) -> dict:
    config = await get_config(session)
    return {
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "title": "Verb Base Form",
        "is_enabled": config.is_enabled,
        "question_count": config.question_count,
        "passing_percentage": config.passing_percentage,
        "duration_minutes": config.duration_minutes,
        "review_policy": config.review_policy.value,
    }


def build_base_prompt_types(count: int = 20) -> list[str]:
    """Mitad español→base y mitad base→español."""
    if count < 2:
        raise ValueError("Se necesitan al menos 2 preguntas.")
    half = count // 2
    types = [BaseFormPromptType.FROM_SPANISH.value] * half + [
        BaseFormPromptType.FROM_BASE.value
    ] * (count - half)
    secrets.SystemRandom().shuffle(types)
    return types


def _valid_answers_for_field(
    answers: list[VerbAnswer], field: VerbAnswerField
) -> list[str]:
    return [a.normalized_value for a in answers if a.field == field]


def _required_field_for_prompt(prompt_type: str) -> str:
    if prompt_type == BaseFormPromptType.FROM_BASE.value:
        return "SPANISH"
    return "BASE"


async def get_open_attempt(
    session: AsyncSession, user_id: uuid.UUID
) -> VerbBaseAttempt | None:
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(selectinload(VerbBaseAttempt.questions))
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    return result.scalar_one_or_none()


async def _submitted_count(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(VerbBaseAttempt)
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.status == AttemptStatus.SUBMITTED,
        )
    )
    return result.scalar_one()


async def create_or_get_attempt(session: AsyncSession, user: User) -> VerbBaseAttempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la evaluación.",
            status_code=403,
        )
    access = await exam_access_service.ensure_exam_available(
        session,
        user_id=user.id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )
    existing = await get_open_attempt(session, user.id)
    if existing:
        return existing

    config = await get_config(session)
    submitted = await _submitted_count(session, user.id)
    if submitted >= access.allowed_attempts:
        raise AppError(
            "MAX_ATTEMPTS_REACHED",
            "Ya completaste tu evaluación. Contacta al profesor si necesitas un nuevo intento.",
            status_code=403,
        )

    verbs_result = await session.execute(
        select(Verb).where(Verb.is_active.is_(True)).options(selectinload(Verb.answers))
    )
    verbs = list(verbs_result.scalars())
    if len(verbs) < config.question_count:
        raise AppError(
            "INSUFFICIENT_VERBS",
            "No hay suficientes verbos activos para este examen.",
            status_code=503,
        )

    selected = secrets.SystemRandom().sample(verbs, config.question_count)
    prompt_types = build_base_prompt_types(config.question_count)
    pairs = list(zip(selected, prompt_types, strict=True))
    secrets.SystemRandom().shuffle(pairs)

    max_number = (
        await session.execute(
            select(func.max(VerbBaseAttempt.attempt_number)).where(
                VerbBaseAttempt.user_id == user.id
            )
        )
    ).scalar_one()
    expires_at = None
    if config.duration_minutes:
        expires_at = datetime.now(UTC) + timedelta(minutes=config.duration_minutes)

    attempt = VerbBaseAttempt(
        id=uuid.uuid4(),
        user_id=user.id,
        attempt_number=(max_number or 0) + 1,
        config_snapshot={
            "question_count": config.question_count,
            "passing_percentage": config.passing_percentage,
            "duration_minutes": config.duration_minutes,
            "review_policy": config.review_policy.value,
            "title": "Verb Base Form",
        },
        status=AttemptStatus.IN_PROGRESS,
        expires_at=expires_at,
        total_questions=config.question_count,
    )
    session.add(attempt)
    await session.flush()

    for position, (verb, prompt_type) in enumerate(pairs, start=1):
        required_field = _required_field_for_prompt(prompt_type)
        valid_answers = _valid_answers_for_field(
            list(verb.answers),
            VerbAnswerField.SPANISH
            if required_field == "SPANISH"
            else VerbAnswerField.BASE,
        )
        session.add(
            VerbBaseAttemptQuestion(
                id=uuid.uuid4(),
                attempt_id=attempt.id,
                position=position,
                verb_id=verb.id,
                snapshot_base=verb.base_display,
                snapshot_past=verb.past_display,
                snapshot_spanish_prompt=verb.spanish_prompt,
                # Guarda las respuestas válidas del campo pedido (base o español).
                snapshot_valid_base_answers=valid_answers,
                prompt_type=prompt_type,
            )
        )

    await session.commit()
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(selectinload(VerbBaseAttempt.questions))
        .where(VerbBaseAttempt.id == attempt.id)
    )
    return result.scalar_one()


async def get_attempt_for_user(
    session: AsyncSession, *, attempt_id: uuid.UUID, user_id: uuid.UUID
) -> VerbBaseAttempt:
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(selectinload(VerbBaseAttempt.questions))
        .where(VerbBaseAttempt.id == attempt_id, VerbBaseAttempt.user_id == user_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado", status_code=404)
    return attempt


def serialize_question(
    question: VerbBaseAttemptQuestion, *, include_grades: bool
) -> dict:
    required_field = _required_field_for_prompt(question.prompt_type)
    if question.prompt_type == BaseFormPromptType.FROM_BASE.value:
        shown_field = "BASE"
        shown_value = question.snapshot_base
        required_label = "meaning in Spanish"
        expected_value = question.snapshot_spanish_prompt
    elif question.prompt_type == BaseFormPromptType.FROM_SPANISH.value:
        shown_field = "SPANISH"
        shown_value = question.snapshot_spanish_prompt
        required_label = "base form in English"
        expected_value = question.snapshot_base
    else:
        # Intentos antiguos que aún muestran pasado → base.
        shown_field = "PAST"
        shown_value = question.snapshot_past
        required_label = "base form in English"
        expected_value = question.snapshot_base
        required_field = "BASE"

    data = {
        "id": str(question.id),
        "position": question.position,
        "prompt_type": question.prompt_type,
        "prompt_label": (
            f"We give you: "
            f"{PROMPT_LABELS.get(question.prompt_type, question.prompt_type)}"
        ),
        "shown_field": shown_field,
        "shown_value": shown_value,
        "required_fields": [{"field": required_field, "label": required_label}],
        "answers": {"base": question.answer_base_raw},
    }
    if include_grades:
        data["grades"] = {"base": question.is_base_correct}
        data["expected"] = {"base": expected_value}
        data["fully_correct"] = question.is_base_correct is True
    return data


def serialize_attempt(attempt: VerbBaseAttempt, *, include_grades: bool) -> dict:
    questions = sorted(attempt.questions, key=lambda q: q.position)
    return {
        "id": str(attempt.id),
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "exam_name": "Verb Base Form",
        "attempt_number": attempt.attempt_number,
        "status": attempt.status.value,
        "started_at": attempt.started_at.isoformat(),
        "expires_at": attempt.expires_at.isoformat() if attempt.expires_at else None,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": [
            serialize_question(q, include_grades=include_grades) for q in questions
        ],
    }


def grade_question(question: VerbBaseAttemptQuestion) -> bool | None:
    raw = question.answer_base_raw
    if raw is None or not raw.strip():
        question.is_base_correct = None
        question.graded_at = datetime.now(UTC)
        return None
    asks_spanish = _required_field_for_prompt(question.prompt_type) == "SPANISH"
    normalizer = normalize_spanish if asks_spanish else normalize_text
    normalized = normalizer(raw)
    question.is_base_correct = normalized in {
        normalizer(v) for v in question.snapshot_valid_base_answers
    }
    question.graded_at = datetime.now(UTC)
    return question.is_base_correct


def grade_attempt(attempt: VerbBaseAttempt) -> None:
    grades = [grade_question(q) for q in attempt.questions]
    correct = sum(g is True for g in grades)
    unanswered = sum(g is None for g in grades)
    incorrect = len(grades) - correct - unanswered
    total = attempt.total_questions or len(grades)
    percentage = Decimal(correct) / Decimal(total) * Decimal(100)
    attempt.correct_answers = correct
    attempt.incorrect_answers = incorrect
    attempt.unanswered_answers = unanswered
    attempt.percentage = float(round(percentage, 2))
    attempt.passed = float(percentage) >= attempt.config_snapshot.get(
        "passing_percentage", 70
    )


async def save_question_answer(
    session: AsyncSession,
    *,
    attempt: VerbBaseAttempt,
    question_id: uuid.UUID,
    answer: str | None,
) -> VerbBaseAttemptQuestion:
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError("ATTEMPT_CLOSED", "Este intento ya fue entregado.", status_code=400)
    if attempt.expires_at and datetime.now(UTC) > attempt.expires_at:
        attempt.status = AttemptStatus.EXPIRED
        await session.commit()
        raise AppError("ATTEMPT_EXPIRED", "El tiempo del examen ha terminado.", status_code=400)
    question = next((q for q in attempt.questions if q.id == question_id), None)
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada", status_code=404)
    question.answer_base_raw = answer
    question.answered_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(question)
    return question


async def submit_attempt(session: AsyncSession, attempt: VerbBaseAttempt) -> VerbBaseAttempt:
    if attempt.status == AttemptStatus.SUBMITTED:
        return attempt
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError("ATTEMPT_CLOSED", "Este intento no puede entregarse.", status_code=400)
    grade_attempt(attempt)
    attempt.status = AttemptStatus.SUBMITTED
    attempt.submitted_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(attempt)
    return attempt


async def get_student_attempt_status(session: AsyncSession, user_id: uuid.UUID) -> dict:
    config = await get_config(session)
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )
    open_attempt = await get_open_attempt(session, user_id)
    submitted = await _submitted_count(session, user_id)
    last = (
        await session.execute(
            select(VerbBaseAttempt)
            .where(
                VerbBaseAttempt.user_id == user_id,
                VerbBaseAttempt.status == AttemptStatus.SUBMITTED,
            )
            .order_by(VerbBaseAttempt.submitted_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    globally_ok = config.is_enabled and access.is_enabled
    return {
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "is_available": globally_ok,
        "has_open_attempt": open_attempt is not None,
        "open_attempt_id": str(open_attempt.id) if open_attempt else None,
        "submitted_count": submitted,
        "max_attempts": access.allowed_attempts,
        "can_start_new": globally_ok
        and open_attempt is None
        and submitted < access.allowed_attempts,
        "last_submitted": (
            {
                "id": str(last.id),
                "percentage": float(last.percentage) if last.percentage is not None else None,
                "passed": last.passed,
                "submitted_at": last.submitted_at.isoformat() if last.submitted_at else None,
            }
            if last
            else None
        ),
    }


async def list_attempts_admin(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(VerbBaseAttempt, User)
        .join(User, User.id == VerbBaseAttempt.user_id)
        .order_by(VerbBaseAttempt.started_at.desc())
    )
    items = []
    for attempt, user in result.all():
        items.append(
            {
                "id": str(attempt.id),
                "exam_type": ExamType.VERB_BASE_EXAM.value,
                "exam_name": "Verb Base Form",
                "attempt_number": attempt.attempt_number,
                "student_id": str(user.id),
                "student_username": user.username,
                "student_name": user.full_name,
                "status": attempt.status.value,
                "started_at": attempt.started_at.isoformat(),
                "submitted_at": (
                    attempt.submitted_at.isoformat() if attempt.submitted_at else None
                ),
                "percentage": (
                    float(attempt.percentage) if attempt.percentage is not None else None
                ),
                "passed": attempt.passed,
            }
        )
    return items


async def serialize_admin_report(
    session: AsyncSession, attempt_id: uuid.UUID
) -> dict:
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(
            selectinload(VerbBaseAttempt.questions),
            selectinload(VerbBaseAttempt.user),
        )
        .where(VerbBaseAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado", status_code=404)
    include_grades = attempt.status == AttemptStatus.SUBMITTED
    data = serialize_attempt(attempt, include_grades=include_grades)
    data.update(
        {
            "student_id": str(attempt.user.id),
            "student_username": attempt.user.username,
            "student_name": attempt.user.full_name,
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "unanswered_answers": attempt.unanswered_answers,
            "total_questions": attempt.total_questions,
            "percentage": float(attempt.percentage) if attempt.percentage is not None else None,
            "passed": attempt.passed,
            "review_policy": attempt.config_snapshot.get("review_policy", "FULL"),
        }
    )
    return data


async def delete_attempts_for_user(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.execute(
        delete(VerbBaseAttempt).where(VerbBaseAttempt.user_id == user_id)
    )
    return result.rowcount or 0
