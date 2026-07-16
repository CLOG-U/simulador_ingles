import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import (
    Attempt,
    AttemptQuestion,
    AttemptStatus,
    ExamConfig,
    PromptType,
    User,
    Verb,
    VerbAnswer,
)
from app.services.exam_engine import (
    FIELD_LABELS,
    PROMPT_LABELS,
    build_balanced_prompt_types,
    fields_for_prompt,
    sample_verb_ids,
    shown_field_for_prompt,
)
from app.services.grading_service import grade_attempt


async def get_exam_config(session: AsyncSession) -> ExamConfig:
    result = await session.execute(select(ExamConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        raise AppError("CONFIG_MISSING", "Configuración de examen no encontrada.", status_code=500)
    return config


async def get_visible_config(session: AsyncSession) -> dict:
    config = await get_exam_config(session)
    return {
        "question_count": config.question_count,
        "passing_percentage": config.passing_percentage,
        "duration_minutes": config.duration_minutes,
        "max_attempts": config.max_attempts,
        "review_policy": config.review_policy.value,
    }


async def _count_submitted_attempts(session: AsyncSession, user_id: uuid.UUID) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(Attempt)
        .where(
            Attempt.user_id == user_id,
            Attempt.status == AttemptStatus.SUBMITTED,
        )
    )
    return result.scalar_one()


async def get_open_attempt(session: AsyncSession, user_id: uuid.UUID) -> Attempt | None:
    result = await session.execute(
        select(Attempt)
        .options(selectinload(Attempt.questions))
        .where(Attempt.user_id == user_id, Attempt.status == AttemptStatus.IN_PROGRESS)
    )
    return result.scalar_one_or_none()


async def _build_valid_answers_map(answers: list[VerbAnswer]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {"BASE": [], "PAST": [], "SPANISH": []}
    for answer in answers:
        grouped[answer.field.value].append(answer.normalized_value)
    return grouped


async def create_or_get_attempt(session: AsyncSession, user: User) -> Attempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la evaluación.",
            status_code=403,
        )

    existing = await get_open_attempt(session, user.id)
    if existing:
        return existing

    config = await get_exam_config(session)
    submitted_count = await _count_submitted_attempts(session, user.id)
    if submitted_count >= config.max_attempts:
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
            "Hay menos de 20 verbos activos. Contacta al profesor.",
            status_code=503,
        )

    selected_ids = sample_verb_ids([v.id for v in verbs], config.question_count)
    verb_map = {v.id: v for v in verbs}
    selected_verbs = [verb_map[vid] for vid in selected_ids]
    prompt_types = build_balanced_prompt_types(config.question_count)

    rng = secrets.SystemRandom()
    pairs = list(zip(selected_verbs, prompt_types, strict=True))
    rng.shuffle(pairs)

    expires_at = None
    if config.duration_minutes:
        expires_at = datetime.now(UTC) + timedelta(minutes=config.duration_minutes)

    attempt = Attempt(
        id=uuid.uuid4(),
        user_id=user.id,
        config_snapshot={
            "question_count": config.question_count,
            "passing_percentage": config.passing_percentage,
            "duration_minutes": config.duration_minutes,
            "max_attempts": config.max_attempts,
            "review_policy": config.review_policy.value,
        },
        status=AttemptStatus.IN_PROGRESS,
        expires_at=expires_at,
        total_fields=config.question_count * 2,
    )
    session.add(attempt)
    await session.flush()

    for position, (verb, prompt_type) in enumerate(pairs, start=1):
        session.add(
            AttemptQuestion(
                id=uuid.uuid4(),
                attempt_id=attempt.id,
                position=position,
                verb_id=verb.id,
                snapshot_base=verb.base_display,
                snapshot_past=verb.past_display,
                snapshot_spanish=verb.spanish_display,
                snapshot_spanish_prompt=verb.spanish_prompt,
                snapshot_valid_answers=await _build_valid_answers_map(list(verb.answers)),
                prompt_type=prompt_type,
            )
        )

    await session.commit()
    result = await session.execute(
        select(Attempt)
        .options(selectinload(Attempt.questions))
        .where(Attempt.id == attempt.id)
    )
    return result.scalar_one()


async def get_attempt_for_user(
    session: AsyncSession, *, attempt_id: uuid.UUID, user_id: uuid.UUID
) -> Attempt:
    result = await session.execute(
        select(Attempt)
        .options(selectinload(Attempt.questions))
        .where(Attempt.id == attempt_id, Attempt.user_id == user_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado", status_code=404)
    return attempt


def serialize_question(question: AttemptQuestion, *, include_grades: bool) -> dict:
    shown = shown_field_for_prompt(question.prompt_type)
    if shown == "SPANISH":
        shown_value = question.snapshot_spanish_prompt
    elif shown == "BASE":
        shown_value = question.snapshot_base
    else:
        shown_value = question.snapshot_past

    required = fields_for_prompt(question.prompt_type)
    data = {
        "id": str(question.id),
        "position": question.position,
        "prompt_type": question.prompt_type.value,
        "prompt_label": f"Te damos: {PROMPT_LABELS[question.prompt_type]}",
        "shown_field": shown,
        "shown_value": shown_value,
        "required_fields": [
            {"field": f, "label": FIELD_LABELS[f]} for f in required
        ],
        "answers": {
            "base": question.answer_base_raw,
            "past": question.answer_past_raw,
            "spanish": question.answer_spanish_raw,
        },
    }
    if include_grades:
        data["grades"] = {
            "base": question.is_base_correct,
            "past": question.is_past_correct,
            "spanish": question.is_spanish_correct,
        }
        data["expected"] = {
            "base": question.snapshot_base,
            "past": question.snapshot_past,
            "spanish": question.snapshot_spanish_prompt,
        }
    return data


def serialize_attempt(attempt: Attempt, *, include_grades: bool) -> dict:
    questions = sorted(attempt.questions, key=lambda q: q.position)
    return {
        "id": str(attempt.id),
        "status": attempt.status.value,
        "started_at": attempt.started_at.isoformat(),
        "expires_at": attempt.expires_at.isoformat() if attempt.expires_at else None,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": [
            serialize_question(q, include_grades=include_grades) for q in questions
        ],
    }


async def save_question_answer(
    session: AsyncSession,
    *,
    attempt: Attempt,
    question_id: uuid.UUID,
    answers: dict[str, str | None],
) -> AttemptQuestion:
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError("ATTEMPT_CLOSED", "Este intento ya fue entregado.", status_code=400)

    if attempt.expires_at and datetime.now(UTC) > attempt.expires_at:
        attempt.status = AttemptStatus.EXPIRED
        await session.commit()
        raise AppError("ATTEMPT_EXPIRED", "El tiempo del examen ha terminado.", status_code=400)

    question = next((q for q in attempt.questions if q.id == question_id), None)
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada", status_code=404)

    if "base" in answers:
        question.answer_base_raw = answers["base"]
    if "past" in answers:
        question.answer_past_raw = answers["past"]
    if "spanish" in answers:
        question.answer_spanish_raw = answers["spanish"]
    question.answered_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(question)
    return question


async def submit_attempt(session: AsyncSession, attempt: Attempt) -> Attempt:
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
    config = await get_exam_config(session)
    open_attempt = await get_open_attempt(session, user_id)
    submitted_count = await _count_submitted_attempts(session, user_id)

    last_submitted = None
    if submitted_count > 0:
        result = await session.execute(
            select(Attempt)
            .where(
                Attempt.user_id == user_id,
                Attempt.status == AttemptStatus.SUBMITTED,
            )
            .order_by(Attempt.submitted_at.desc())
            .limit(1)
        )
        last = result.scalar_one_or_none()
        if last:
            last_submitted = {
                "id": str(last.id),
                "percentage": float(last.percentage) if last.percentage is not None else None,
                "passed": last.passed,
                "submitted_at": last.submitted_at.isoformat() if last.submitted_at else None,
            }

    can_start_new = open_attempt is not None or submitted_count < config.max_attempts

    return {
        "has_open_attempt": open_attempt is not None,
        "open_attempt_id": str(open_attempt.id) if open_attempt else None,
        "submitted_count": submitted_count,
        "max_attempts": config.max_attempts,
        "can_start_new": can_start_new,
        "last_submitted": last_submitted,
    }


async def get_student_attempt_stats(
    session: AsyncSession, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[str, int | bool]]:
    if not user_ids:
        return {}

    config = await get_exam_config(session)
    max_attempts = config.max_attempts

    submitted_result = await session.execute(
        select(Attempt.user_id, func.count())
        .where(
            Attempt.user_id.in_(user_ids),
            Attempt.status == AttemptStatus.SUBMITTED,
        )
        .group_by(Attempt.user_id)
    )
    used_map = {row[0]: row[1] for row in submitted_result.all()}

    open_result = await session.execute(
        select(Attempt.user_id).where(
            Attempt.user_id.in_(user_ids),
            Attempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    open_set = {row[0] for row in open_result.all()}

    return {
        user_id: {
            "attempts_used": used_map.get(user_id, 0),
            "attempts_max": max_attempts,
            "attempts_remaining": max(0, max_attempts - used_map.get(user_id, 0)),
            "has_open_attempt": user_id in open_set,
        }
        for user_id in user_ids
    }


async def allow_new_attempt(session: AsyncSession, user_id: uuid.UUID) -> None:
    result = await session.execute(
        select(Attempt).where(
            Attempt.user_id == user_id,
            Attempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.IN_PROGRESS]),
        )
    )
    for attempt in result.scalars():
        attempt.status = AttemptStatus.CANCELLED
    await session.commit()
