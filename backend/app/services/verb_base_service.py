"""Examen y práctica Verb Base Form: español ↔ forma base (sin pasado)."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
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
from app.services.normalization import normalize_text, spanish_answer_matches

PROMPT_LABELS = {
    BaseFormPromptType.FROM_SPANISH.value: "Spanish",
    BaseFormPromptType.FROM_BASE.value: "base form in English",
}

MODE_EXAM = "exam"
MODE_PRACTICE = "practice"


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
    active_count = (
        await session.execute(
            select(func.count()).select_from(Verb).where(Verb.is_active.is_(True))
        )
    ).scalar_one()
    return {
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "title": "Verb Base Form",
        "is_enabled": config.is_enabled,
        "practice_enabled": config.practice_enabled,
        "question_count": config.question_count,
        "question_bank_size": active_count,
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
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
) -> VerbBaseAttempt | None:
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(selectinload(VerbBaseAttempt.questions))
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == mode,
            VerbBaseAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    return result.scalar_one_or_none()


async def _submitted_count(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(VerbBaseAttempt)
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == mode,
            VerbBaseAttempt.status == AttemptStatus.SUBMITTED,
        )
    )
    return result.scalar_one()


async def _create_attempt_with_questions(
    session: AsyncSession,
    *,
    user: User,
    mode: str,
    title: str,
    review_policy: str,
    duration_minutes: int | None,
    passing_percentage: int,
    question_count: int,
) -> VerbBaseAttempt:
    verbs_result = await session.execute(
        select(Verb).where(Verb.is_active.is_(True)).options(selectinload(Verb.answers))
    )
    verbs = list(verbs_result.scalars())
    if len(verbs) < question_count:
        raise AppError(
            "INSUFFICIENT_VERBS",
            "No hay suficientes verbos activos para esta sesión.",
            status_code=503,
        )

    selected = secrets.SystemRandom().sample(verbs, question_count)
    prompt_types = build_base_prompt_types(question_count)
    pairs = list(zip(selected, prompt_types, strict=True))
    secrets.SystemRandom().shuffle(pairs)

    max_number = (
        await session.execute(
            select(func.max(VerbBaseAttempt.attempt_number)).where(
                VerbBaseAttempt.user_id == user.id,
                VerbBaseAttempt.mode == mode,
            )
        )
    ).scalar_one()
    expires_at = None
    if duration_minutes:
        expires_at = datetime.now(UTC) + timedelta(minutes=duration_minutes)

    attempt = VerbBaseAttempt(
        id=uuid.uuid4(),
        user_id=user.id,
        mode=mode,
        attempt_number=(max_number or 0) + 1,
        config_snapshot={
            "question_count": question_count,
            "passing_percentage": passing_percentage,
            "duration_minutes": duration_minutes,
            "review_policy": review_policy,
            "title": title,
            "mode": mode,
        },
        status=AttemptStatus.IN_PROGRESS,
        expires_at=expires_at,
        total_questions=question_count,
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
    existing = await get_open_attempt(session, user.id, mode=MODE_EXAM)
    if existing:
        return existing

    config = await get_config(session)
    submitted = await _submitted_count(session, user.id, mode=MODE_EXAM)
    if submitted >= access.allowed_attempts:
        raise AppError(
            "MAX_ATTEMPTS_REACHED",
            "Ya completaste tu evaluación. Contacta al profesor si necesitas un nuevo intento.",
            status_code=403,
        )

    return await _create_attempt_with_questions(
        session,
        user=user,
        mode=MODE_EXAM,
        title="Verb Base Form",
        review_policy=config.review_policy.value,
        duration_minutes=config.duration_minutes,
        passing_percentage=config.passing_percentage,
        question_count=config.question_count,
    )


async def abandon_open_practice(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """Cancela sesiones de práctica IN_PROGRESS del estudiante (no borra historial)."""
    result = await session.execute(
        select(VerbBaseAttempt).where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == MODE_PRACTICE,
            VerbBaseAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    abandoned = 0
    for attempt in result.scalars():
        attempt.status = AttemptStatus.CANCELLED
        abandoned += 1
    if abandoned:
        await session.flush()
    return abandoned


async def create_or_get_practice(
    session: AsyncSession,
    user: User,
    *,
    force_new: bool = False,
) -> VerbBaseAttempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la práctica.",
            status_code=403,
        )

    await session.execute(select(User).where(User.id == user.id).with_for_update())
    config = await get_config(session)
    await exam_access_service.ensure_practice_available(
        session,
        user_id=user.id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )

    if force_new:
        await abandon_open_practice(session, user.id)
    else:
        existing = await get_open_attempt(session, user.id, mode=MODE_PRACTICE)
        if existing:
            return existing

    try:
        return await _create_attempt_with_questions(
            session,
            user=user,
            mode=MODE_PRACTICE,
            title="Verb Base Form Practice",
            review_policy="FULL",
            duration_minutes=None,
            passing_percentage=config.passing_percentage,
            question_count=config.question_count,
        )
    except IntegrityError:
        await session.rollback()
        recovered = await get_open_attempt(session, user.id, mode=MODE_PRACTICE)
        if recovered and not force_new:
            return recovered
        raise AppError(
            "PRACTICE_START_FAILED",
            "No se pudo iniciar la práctica. Intenta de nuevo.",
            status_code=409,
        )


async def restart_practice(
    session: AsyncSession,
    user: User,
) -> VerbBaseAttempt:
    """Abandona la sesión abierta (si hay) y crea una práctica nueva."""
    await exam_access_service.ensure_practice_available(
        session,
        user_id=user.id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )
    await abandon_open_practice(session, user.id)
    await session.commit()
    return await create_or_get_practice(session, user, force_new=False)


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


async def _lock_attempt(
    session: AsyncSession,
    *,
    attempt_id: uuid.UUID,
    user_id: uuid.UUID,
) -> VerbBaseAttempt:
    result = await session.execute(
        select(VerbBaseAttempt)
        .options(selectinload(VerbBaseAttempt.questions))
        .where(
            VerbBaseAttempt.id == attempt_id,
            VerbBaseAttempt.user_id == user_id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
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
        data["is_correct"] = question.is_base_correct
        data["status"] = (
            "unanswered"
            if question.is_base_correct is None
            else "correct"
            if question.is_base_correct
            else "incorrect"
        )
        data["correct_answer"] = expected_value
    return data


def serialize_attempt(attempt: VerbBaseAttempt, *, include_grades: bool) -> dict:
    questions = sorted(attempt.questions, key=lambda q: q.position)
    mode = attempt.mode or MODE_EXAM
    is_practice = mode == MODE_PRACTICE
    return {
        "id": str(attempt.id),
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "mode": mode,
        "exam_name": "Verb Base Form Practice" if is_practice else "Verb Base Form",
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
    valid = list(question.snapshot_valid_base_answers or [])
    if asks_spanish:
        question.is_base_correct = spanish_answer_matches(raw, valid)
    else:
        normalized = normalize_text(raw)
        question.is_base_correct = normalized in {normalize_text(v) for v in valid}
    question.graded_at = datetime.now(UTC)
    return question.is_base_correct


def recompute_attempt_from_grades(attempt: VerbBaseAttempt) -> None:
    """Recalcula totales sin re-evaluar las respuestas (respeta overrides)."""
    grades = [q.is_base_correct for q in attempt.questions]
    correct = sum(g is True for g in grades)
    unanswered = sum(g is None for g in grades)
    incorrect = len(grades) - correct - unanswered
    total = attempt.total_questions or len(grades) or 1
    percentage = Decimal(correct) / Decimal(total) * Decimal(100)
    attempt.correct_answers = correct
    attempt.incorrect_answers = incorrect
    attempt.unanswered_answers = unanswered
    attempt.percentage = float(round(percentage, 2))
    attempt.passed = float(percentage) >= attempt.config_snapshot.get(
        "passing_percentage", 70
    )


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


async def check_practice_answer(
    session: AsyncSession,
    *,
    attempt: VerbBaseAttempt,
    question_id: uuid.UUID,
    answer: str | None,
) -> dict:
    if (attempt.mode or MODE_EXAM) != MODE_PRACTICE:
        raise AppError(
            "NOT_PRACTICE",
            "Solo la práctica permite revisar respuestas de inmediato.",
            status_code=400,
        )
    locked_attempt = await _lock_attempt(
        session,
        attempt_id=attempt.id,
        user_id=attempt.user_id,
    )
    if locked_attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError("ATTEMPT_CLOSED", "Esta práctica ya fue entregada.", status_code=400)
    question = next(
        (item for item in locked_attempt.questions if item.id == question_id),
        None,
    )
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada", status_code=404)
    question.answer_base_raw = answer
    question.answered_at = datetime.now(UTC)
    grade_question(question)
    await session.commit()
    await session.refresh(question)
    return serialize_question(question, include_grades=True)


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


def serialize_result(
    attempt: VerbBaseAttempt,
    *,
    student: User,
    include_review: bool,
) -> dict:
    is_graded = attempt.status == AttemptStatus.SUBMITTED
    percentage = float(attempt.percentage) if attempt.percentage is not None else None
    data = {
        **serialize_attempt(attempt, include_grades=include_review and is_graded),
        "student_id": str(student.id),
        "student_name": student.full_name,
        "student_username": student.username,
        "duration_seconds": (
            int((attempt.submitted_at - attempt.started_at).total_seconds())
            if attempt.submitted_at
            else None
        ),
        "total_questions": attempt.total_questions,
        "correct_answers": attempt.correct_answers,
        "incorrect_answers": attempt.incorrect_answers,
        "unanswered_answers": attempt.unanswered_answers,
        "percentage": percentage,
        "score_out_of_ten": (
            float(round(percentage / 10, 2)) if percentage is not None else None
        ),
        "passed": attempt.passed,
        "review_policy": attempt.config_snapshot.get("review_policy", "FULL"),
    }
    if not include_review:
        data["questions"] = []
    return data


async def get_student_attempt_status(session: AsyncSession, user_id: uuid.UUID) -> dict:
    return await get_attempt_status(session, user_id, mode=MODE_EXAM)


async def get_attempt_status(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
) -> dict:
    config = await get_config(session)
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )
    open_attempt = await get_open_attempt(session, user_id, mode=mode)
    submitted = await _submitted_count(session, user_id, mode=mode)
    last = (
        await session.execute(
            select(VerbBaseAttempt)
            .where(
                VerbBaseAttempt.user_id == user_id,
                VerbBaseAttempt.mode == mode,
                VerbBaseAttempt.status == AttemptStatus.SUBMITTED,
            )
            .order_by(VerbBaseAttempt.submitted_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    last_submitted = (
        {
            "id": str(last.id),
            "percentage": float(last.percentage) if last.percentage is not None else None,
            "passed": last.passed,
            "submitted_at": last.submitted_at.isoformat() if last.submitted_at else None,
        }
        if last
        else None
    )

    if mode == MODE_PRACTICE:
        available = config.practice_enabled and access.practice_enabled
        return {
            "exam_type": ExamType.VERB_BASE_EXAM.value,
            "mode": MODE_PRACTICE,
            "is_available": available,
            "has_open_attempt": open_attempt is not None,
            "open_attempt_id": str(open_attempt.id) if open_attempt else None,
            "submitted_count": submitted,
            "max_attempts": None,
            "can_start_new": available,
            "last_submitted": last_submitted,
            "question_bank_size": (
                await session.execute(
                    select(func.count())
                    .select_from(Verb)
                    .where(Verb.is_active.is_(True))
                )
            ).scalar_one(),
        }

    globally_ok = config.is_enabled and access.is_enabled
    return {
        "exam_type": ExamType.VERB_BASE_EXAM.value,
        "mode": MODE_EXAM,
        "is_available": globally_ok,
        "has_open_attempt": open_attempt is not None,
        "open_attempt_id": str(open_attempt.id) if open_attempt else None,
        "submitted_count": submitted,
        "max_attempts": access.allowed_attempts,
        "can_start_new": globally_ok
        and open_attempt is None
        and submitted < access.allowed_attempts,
        "last_submitted": last_submitted,
    }


async def list_attempts_admin(
    session: AsyncSession,
    *,
    mode: str = MODE_EXAM,
) -> list[dict]:
    result = await session.execute(
        select(VerbBaseAttempt, User)
        .join(User, User.id == VerbBaseAttempt.user_id)
        .where(VerbBaseAttempt.mode == mode)
        .order_by(VerbBaseAttempt.started_at.desc())
    )
    is_practice = mode == MODE_PRACTICE
    items = []
    for attempt, user in result.all():
        items.append(
            {
                "id": str(attempt.id),
                "exam_type": ExamType.VERB_BASE_EXAM.value,
                "mode": mode,
                "exam_name": (
                    "Verb Base Form Practice" if is_practice else "Verb Base Form"
                ),
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
            "score_out_of_ten": (
                float(round(float(attempt.percentage) / 10, 2))
                if attempt.percentage is not None
                else None
            ),
            "duration_seconds": (
                int((attempt.submitted_at - attempt.started_at).total_seconds())
                if attempt.submitted_at
                else None
            ),
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


async def reset_student_progress(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    actor_id: uuid.UUID,
    mode: str,
) -> dict:
    """Elimina intentos del modo indicado (examen o práctica)."""
    if mode not in {MODE_EXAM, MODE_PRACTICE}:
        raise AppError(
            "INVALID_MODE",
            "Modo inválido. Usa exam o practice.",
            status_code=400,
        )

    deleted = await session.execute(
        delete(VerbBaseAttempt).where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == mode,
        )
    )
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.VERB_BASE_EXAM,
    )
    if mode == MODE_EXAM:
        access.allowed_attempts = 1
    access.updated_by = actor_id
    await session.flush()
    return {
        "mode": mode,
        "deleted_attempts": deleted.rowcount or 0,
        "allowed_attempts": access.allowed_attempts,
        "is_enabled": access.is_enabled,
        "practice_enabled": access.practice_enabled,
    }


async def override_question_grade(
    session: AsyncSession,
    *,
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    correct: bool,
) -> dict:
    """Permite al admin marcar una pregunta como correcta/incorrecta y recalcular."""
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
    if attempt.status != AttemptStatus.SUBMITTED:
        raise AppError(
            "ATTEMPT_NOT_SUBMITTED",
            "Solo se puede corregir un intento ya entregado.",
            status_code=400,
        )
    question = next((q for q in attempt.questions if q.id == question_id), None)
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada", status_code=404)
    question.is_base_correct = correct
    question.graded_at = datetime.now(UTC)
    recompute_attempt_from_grades(attempt)
    await session.flush()
    return await serialize_admin_report(session, attempt_id)
