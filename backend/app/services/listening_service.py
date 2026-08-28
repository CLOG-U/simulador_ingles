import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import (
    AttemptStatus,
    ExamType,
    ListeningAttempt,
    ListeningAttemptQuestion,
    ListeningConfig,
    ListeningQuestion,
    User,
)
from app.services import exam_access_service
from app.services.listening_grading import (
    automatic_observation,
    grade_attempt,
    grade_question,
    recompute_attempt_from_grades,
    topic_performance,
)
from seed.listening_data import (
    EMMA_WEEKEND_CLIP_KEY,
    LISTENING_CLIPS,
    LISTENING_EXAM_CLIPS,
    LISTENING_EXAM_QUESTION_COUNT,
)


def clip_catalog() -> list:
    return sorted(LISTENING_CLIPS, key=lambda item: (item.sort_order, item.title))


def exam_clip_catalog() -> list:
    return sorted(LISTENING_EXAM_CLIPS, key=lambda item: (item.sort_order, item.title))


def exam_clip_key() -> str:
    clips = exam_clip_catalog()
    return clips[0].clip_key if clips else EMMA_WEEKEND_CLIP_KEY


def exam_clip_keys() -> set[str]:
    return {item.clip_key for item in LISTENING_EXAM_CLIPS}


def practice_clip_keys() -> set[str]:
    return {item.clip_key for item in LISTENING_CLIPS}


def _clip_meta(clip_key: str):
    for item in (*LISTENING_CLIPS, *LISTENING_EXAM_CLIPS):
        if item.clip_key == clip_key:
            return item
    return None


async def get_config(session: AsyncSession) -> ListeningConfig:
    result = await session.execute(select(ListeningConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        raise AppError(
            "CONFIG_MISSING",
            "Configuración de Listening Practice no encontrada.",
            status_code=500,
        )
    return config


MODE_EXAM = "exam"
MODE_PRACTICE = "practice"


async def get_visible_config(session: AsyncSession) -> dict:
    config = await get_config(session)
    practice_keys = list(practice_clip_keys())
    exam_keys = list(exam_clip_keys())
    practice_count = (
        await session.execute(
            select(func.count())
            .select_from(ListeningQuestion)
            .where(
                ListeningQuestion.active.is_(True),
                ListeningQuestion.clip_key.in_(practice_keys),
            )
        )
    ).scalar_one()
    exam_count = (
        await session.execute(
            select(func.count())
            .select_from(ListeningQuestion)
            .where(
                ListeningQuestion.active.is_(True),
                ListeningQuestion.clip_key.in_(exam_keys),
            )
        )
    ).scalar_one()
    clip_count = (
        await session.execute(
            select(func.count(func.distinct(ListeningQuestion.clip_key))).where(
                ListeningQuestion.active.is_(True),
                ListeningQuestion.clip_key.in_(practice_keys),
            )
        )
    ).scalar_one()
    exam_meta = exam_clip_catalog()[0] if exam_clip_catalog() else None
    return {
        "exam_type": ExamType.LISTENING_PRACTICE.value,
        "title": "Listening Exam",
        "exam_clip_title": exam_meta.title if exam_meta else None,
        "is_enabled": config.is_enabled,
        "practice_enabled": config.practice_enabled,
        "question_count": config.question_count or LISTENING_EXAM_QUESTION_COUNT,
        "question_bank_size": practice_count,
        "exam_question_bank_size": exam_count,
        "clip_count": clip_count,
        "passing_percentage": config.passing_percentage,
        "duration_minutes": config.duration_minutes,
        "review_policy": config.review_policy.value,
    }


async def list_practice_clips(session: AsyncSession, user_id: uuid.UUID) -> dict:
    config = await get_config(session)
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.LISTENING_PRACTICE,
    )
    available = bool(config.practice_enabled and access.practice_enabled)

    counts_result = await session.execute(
        select(ListeningQuestion.clip_key, func.count())
        .where(ListeningQuestion.active.is_(True))
        .group_by(ListeningQuestion.clip_key)
    )
    question_counts = {clip_key: count for clip_key, count in counts_result.all()}

    titles_result = await session.execute(
        select(ListeningQuestion.clip_key, ListeningQuestion.clip_title)
        .where(ListeningQuestion.active.is_(True))
        .distinct()
    )
    titles = {clip_key: title for clip_key, title in titles_result.all()}

    catalog = {item.clip_key: item for item in clip_catalog()}
    excluded = exam_clip_keys()
    clip_keys = list(catalog.keys())
    for key in question_counts:
        if key not in catalog and key not in excluded:
            clip_keys.append(key)

    items = []
    for clip_key in clip_keys:
        if clip_key in excluded:
            continue
        question_count = int(question_counts.get(clip_key, 0))
        if question_count == 0:
            continue
        meta = catalog.get(clip_key)
        open_attempt = await get_open_attempt(
            session, user_id, mode=MODE_PRACTICE, clip_key=clip_key
        )
        submitted_count = await _submitted_count(
            session, user_id, mode=MODE_PRACTICE, clip_key=clip_key
        )
        items.append(
            {
                "clip_key": clip_key,
                "title": meta.title if meta else titles.get(clip_key, clip_key),
                "description": (
                    meta.description
                    if meta
                    else "Listen to the audio and answer the questions."
                ),
                "audio_url": meta.audio_url if meta else None,
                "question_count": question_count,
                "submitted_count": submitted_count,
                "has_open_attempt": open_attempt is not None,
                "open_attempt_id": str(open_attempt.id) if open_attempt else None,
                "can_start": available,
            }
        )
    return {"is_available": available, "items": items}


async def get_open_attempt(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
    clip_key: str | None = None,
) -> ListeningAttempt | None:
    query = (
        select(ListeningAttempt)
        .options(selectinload(ListeningAttempt.questions))
        .where(
            ListeningAttempt.user_id == user_id,
            ListeningAttempt.mode == mode,
            ListeningAttempt.status == AttemptStatus.IN_PROGRESS,
        )
        .with_for_update()
    )
    if clip_key:
        query = query.where(ListeningAttempt.clip_key == clip_key)
    result = await session.execute(query)
    attempt = result.scalars().first()
    if (
        attempt
        and attempt.expires_at
        and datetime.now(UTC) > attempt.expires_at
    ):
        grade_attempt(attempt)
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = attempt.expires_at
        await session.commit()
        return None
    return attempt


async def _submitted_count(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
    clip_key: str | None = None,
) -> int:
    query = select(func.count()).select_from(ListeningAttempt).where(
        ListeningAttempt.user_id == user_id,
        ListeningAttempt.mode == mode,
        ListeningAttempt.status == AttemptStatus.SUBMITTED,
    )
    if clip_key:
        query = query.where(ListeningAttempt.clip_key == clip_key)
    result = await session.execute(query)
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
    clip_key: str,
) -> ListeningAttempt:
    query = select(ListeningQuestion).where(ListeningQuestion.active.is_(True))
    if clip_key:
        query = query.where(ListeningQuestion.clip_key == clip_key)
    result = await session.execute(query)
    bank = list(result.scalars())
    if not bank:
        raise AppError(
            "INSUFFICIENT_QUESTIONS",
            "No hay preguntas de listening activas para este audio.",
            status_code=503,
        )
    selected = sorted(bank, key=lambda item: item.stable_key)
    if question_count > 0:
        selected = selected[:question_count]
    question_count = len(selected)
    resolved_clip_key = clip_key or selected[0].clip_key
    clip_title = selected[0].clip_title

    max_number = (
        await session.execute(
            select(func.max(ListeningAttempt.attempt_number)).where(
                ListeningAttempt.user_id == user.id,
                ListeningAttempt.mode == mode,
                ListeningAttempt.clip_key == resolved_clip_key,
            )
        )
    ).scalar_one()
    expires_at = (
        datetime.now(UTC) + timedelta(minutes=duration_minutes)
        if duration_minutes
        else None
    )
    attempt = ListeningAttempt(
        id=uuid.uuid4(),
        user_id=user.id,
        mode=mode,
        clip_key=resolved_clip_key,
        attempt_number=(max_number or 0) + 1,
        config_snapshot={
            "exam_type": ExamType.LISTENING_PRACTICE.value,
            "mode": mode,
            "title": title,
            "clip_key": resolved_clip_key,
            "clip_title": clip_title,
            "question_count": question_count,
            "passing_percentage": passing_percentage,
            "duration_minutes": duration_minutes,
            "review_policy": review_policy,
        },
        status=AttemptStatus.IN_PROGRESS,
        expires_at=expires_at,
        total_questions=question_count,
    )
    session.add(attempt)
    await session.flush()

    for position, question in enumerate(selected, start=1):
        session.add(
            ListeningAttemptQuestion(
                id=uuid.uuid4(),
                attempt_id=attempt.id,
                source_question_id=question.id,
                position=position,
                snapshot_topic=question.topic,
                snapshot_question_type=question.question_type,
                snapshot_instruction=question.instruction,
                snapshot_question=question.question,
                snapshot_options=question.options,
                snapshot_correct_answer=question.correct_answer,
                snapshot_accepted_answers=question.accepted_answers,
                snapshot_explanation=question.explanation,
                snapshot_points=question.points,
                snapshot_audio_url=question.audio_url,
                snapshot_clip_title=question.clip_title,
            )
        )

    await session.commit()
    return await get_attempt_for_user(
        session,
        attempt_id=attempt.id,
        user_id=user.id,
    )


async def create_or_get_attempt(
    session: AsyncSession,
    user: User,
) -> ListeningAttempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la evaluación.",
            status_code=403,
        )

    await session.execute(select(User).where(User.id == user.id).with_for_update())
    access = await exam_access_service.ensure_exam_available(
        session,
        user_id=user.id,
        exam_type=ExamType.LISTENING_PRACTICE,
    )
    existing = await get_open_attempt(session, user.id, mode=MODE_EXAM)
    if existing:
        return existing

    submitted_count = await _submitted_count(session, user.id, mode=MODE_EXAM)
    if submitted_count >= access.allowed_attempts:
        raise AppError(
            "MAX_ATTEMPTS_REACHED",
            "Ya completaste Listening Exam. Contacta al profesor para un nuevo intento.",
            status_code=403,
        )

    config = await get_config(session)
    clip_key = exam_clip_key()
    return await _create_attempt_with_questions(
        session,
        user=user,
        mode=MODE_EXAM,
        title="Listening Exam",
        review_policy=config.review_policy.value,
        duration_minutes=config.duration_minutes,
        passing_percentage=config.passing_percentage,
        question_count=config.question_count,
        clip_key=clip_key,
    )


async def abandon_open_practice(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    clip_key: str | None = None,
) -> int:
    """Cancela sesiones de práctica IN_PROGRESS del estudiante (no borra historial)."""
    query = select(ListeningAttempt).where(
        ListeningAttempt.user_id == user_id,
        ListeningAttempt.mode == MODE_PRACTICE,
        ListeningAttempt.status == AttemptStatus.IN_PROGRESS,
    )
    if clip_key:
        query = query.where(ListeningAttempt.clip_key == clip_key)
    result = await session.execute(query)
    abandoned = 0
    for attempt in result.scalars():
        attempt.status = AttemptStatus.CANCELLED
        abandoned += 1
    if abandoned:
        await session.flush()
    return abandoned


def _require_clip_key(clip_key: str | None) -> str:
    key = (clip_key or "").strip()
    if not key:
        raise AppError(
            "CLIP_REQUIRED",
            "Debes indicar el audio de listening.",
            status_code=400,
        )
    return key


async def create_or_get_practice(
    session: AsyncSession,
    user: User,
    *,
    clip_key: str,
    force_new: bool = False,
) -> ListeningAttempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la práctica.",
            status_code=403,
        )

    resolved_key = _require_clip_key(clip_key)
    if resolved_key in exam_clip_keys():
        raise AppError(
            "EXAM_CLIP",
            "Este audio pertenece al examen de listening, no a la práctica.",
            status_code=400,
        )
    await session.execute(select(User).where(User.id == user.id).with_for_update())
    config = await get_config(session)
    await exam_access_service.ensure_practice_available(
        session,
        user_id=user.id,
        exam_type=ExamType.LISTENING_PRACTICE,
    )

    if force_new:
        await abandon_open_practice(session, user.id, clip_key=resolved_key)
    else:
        existing = await get_open_attempt(
            session, user.id, mode=MODE_PRACTICE, clip_key=resolved_key
        )
        if existing:
            return existing

    meta = _clip_meta(resolved_key)
    title = meta.title if meta else resolved_key
    try:
        return await _create_attempt_with_questions(
            session,
            user=user,
            mode=MODE_PRACTICE,
            title=title,
            review_policy="FULL",
            duration_minutes=None,
            passing_percentage=config.passing_percentage,
            question_count=0,
            clip_key=resolved_key,
        )
    except IntegrityError:
        await session.rollback()
        recovered = await get_open_attempt(
            session, user.id, mode=MODE_PRACTICE, clip_key=resolved_key
        )
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
    *,
    clip_key: str,
) -> ListeningAttempt:
    """Abandona la sesión abierta de este clip (si hay) y crea una práctica nueva."""
    resolved_key = _require_clip_key(clip_key)
    await exam_access_service.ensure_practice_available(
        session,
        user_id=user.id,
        exam_type=ExamType.LISTENING_PRACTICE,
    )
    await abandon_open_practice(session, user.id, clip_key=resolved_key)
    await session.commit()
    return await create_or_get_practice(session, user, clip_key=resolved_key, force_new=False)


async def get_attempt_for_user(
    session: AsyncSession,
    *,
    attempt_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ListeningAttempt:
    result = await session.execute(
        select(ListeningAttempt)
        .options(selectinload(ListeningAttempt.questions))
        .where(
            ListeningAttempt.id == attempt_id,
            ListeningAttempt.user_id == user_id,
        )
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado.", status_code=404)
    if (
        attempt.status == AttemptStatus.IN_PROGRESS
        and attempt.expires_at
        and datetime.now(UTC) > attempt.expires_at
    ):
        attempt = await _lock_attempt(
            session,
            attempt_id=attempt.id,
            user_id=user_id,
        )
        if (
            attempt.status == AttemptStatus.IN_PROGRESS
            and attempt.expires_at
            and datetime.now(UTC) > attempt.expires_at
        ):
            grade_attempt(attempt)
            attempt.status = AttemptStatus.SUBMITTED
            attempt.submitted_at = attempt.expires_at
            await session.commit()
    return attempt


async def _lock_attempt(
    session: AsyncSession,
    *,
    attempt_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ListeningAttempt:
    result = await session.execute(
        select(ListeningAttempt)
        .options(selectinload(ListeningAttempt.questions))
        .where(
            ListeningAttempt.id == attempt_id,
            ListeningAttempt.user_id == user_id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado.", status_code=404)
    return attempt


def serialize_question(
    question: ListeningAttemptQuestion,
    *,
    include_grades: bool,
) -> dict:
    data = {
        "id": str(question.id),
        "position": question.position,
        "topic": question.snapshot_topic,
        "question_type": question.snapshot_question_type,
        "instruction": question.snapshot_instruction,
        "question": question.snapshot_question,
        "options": question.snapshot_options,
        "answer": question.answer_raw,
        "audio_url": question.snapshot_audio_url,
        "clip_title": question.snapshot_clip_title,
    }
    if include_grades:
        data.update(
            {
                "correct_answer": question.snapshot_correct_answer,
                "is_correct": question.is_correct,
                "status": (
                    "unanswered"
                    if question.is_correct is None
                    else "correct"
                    if question.is_correct
                    else "incorrect"
                ),
                "explanation": question.snapshot_explanation,
            }
        )
    return data


def serialize_attempt(
    attempt: ListeningAttempt,
    *,
    include_grades: bool,
) -> dict:
    mode = attempt.mode or MODE_EXAM
    is_practice = mode == MODE_PRACTICE
    clip_key = attempt.clip_key or (attempt.config_snapshot or {}).get("clip_key")
    clip_title = (attempt.config_snapshot or {}).get("clip_title")
    if not clip_title and attempt.questions:
        clip_title = attempt.questions[0].snapshot_clip_title
    return {
        "id": str(attempt.id),
        "exam_type": ExamType.LISTENING_PRACTICE.value,
        "mode": mode,
        "exam_name": clip_title or ("Listening Practice" if is_practice else "Listening Exam"),
        "clip_key": clip_key,
        "clip_title": clip_title,
        "attempt_number": attempt.attempt_number,
        "status": attempt.status.value,
        "started_at": attempt.started_at.isoformat(),
        "expires_at": attempt.expires_at.isoformat() if attempt.expires_at else None,
        "submitted_at": (
            attempt.submitted_at.isoformat() if attempt.submitted_at else None
        ),
        "questions": [
            serialize_question(question, include_grades=include_grades)
            for question in sorted(attempt.questions, key=lambda item: item.position)
        ],
    }


async def save_answer(
    session: AsyncSession,
    *,
    attempt: ListeningAttempt,
    question_id: uuid.UUID,
    answer: str | None,
) -> ListeningAttemptQuestion:
    locked_attempt = await _lock_attempt(
        session,
        attempt_id=attempt.id,
        user_id=attempt.user_id,
    )
    if locked_attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError("ATTEMPT_CLOSED", "Este intento ya fue entregado.", status_code=400)
    question = next(
        (item for item in locked_attempt.questions if item.id == question_id),
        None,
    )
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada.", status_code=404)
    question.answer_raw = answer
    question.answered_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(question)
    return question


async def check_practice_answer(
    session: AsyncSession,
    *,
    attempt: ListeningAttempt,
    question_id: uuid.UUID,
    answer: str | None,
) -> dict:
    if attempt.mode != MODE_PRACTICE:
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
        raise AppError("NOT_FOUND", "Pregunta no encontrada.", status_code=404)
    question.answer_raw = answer
    question.answered_at = datetime.now(UTC)
    grade_question(question)
    await session.commit()
    await session.refresh(question)
    return serialize_question(question, include_grades=True)


async def submit_attempt(
    session: AsyncSession,
    attempt: ListeningAttempt,
) -> ListeningAttempt:
    locked_attempt = await _lock_attempt(
        session,
        attempt_id=attempt.id,
        user_id=attempt.user_id,
    )
    if locked_attempt.status == AttemptStatus.SUBMITTED:
        return locked_attempt
    if locked_attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError(
            "ATTEMPT_CLOSED",
            "Este intento no puede entregarse.",
            status_code=400,
        )

    now = datetime.now(UTC)
    grade_attempt(locked_attempt)
    locked_attempt.status = AttemptStatus.SUBMITTED
    locked_attempt.submitted_at = (
        locked_attempt.expires_at
        if locked_attempt.expires_at and now > locked_attempt.expires_at
        else now
    )
    await session.commit()
    return await get_attempt_for_user(
        session,
        attempt_id=locked_attempt.id,
        user_id=locked_attempt.user_id,
    )


def serialize_result(
    attempt: ListeningAttempt,
    *,
    student: User,
    include_review: bool,
) -> dict:
    is_graded = attempt.status == AttemptStatus.SUBMITTED
    data = {
        **serialize_attempt(
            attempt,
            include_grades=include_review and is_graded,
        ),
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
        "percentage": (
            float(attempt.percentage) if attempt.percentage is not None else None
        ),
        "score_out_of_ten": (
            float(attempt.score_out_of_ten)
            if attempt.score_out_of_ten is not None
            else None
        ),
        "passed": attempt.passed,
        "review_policy": attempt.config_snapshot.get("review_policy", "FULL"),
        "topic_performance": topic_performance(attempt) if is_graded else [],
        "observation": (
            automatic_observation(attempt)
            if is_graded
            else {"strong_topics": [], "topics_to_review": []}
        ),
    }
    if not include_review:
        data["questions"] = []
    return data


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
        exam_type=ExamType.LISTENING_PRACTICE,
    )
    open_attempt = await get_open_attempt(session, user_id, mode=mode)
    submitted_count = await _submitted_count(session, user_id, mode=mode)
    last_submitted = None
    result = await session.execute(
        select(ListeningAttempt)
        .where(
            ListeningAttempt.user_id == user_id,
            ListeningAttempt.mode == mode,
            ListeningAttempt.status == AttemptStatus.SUBMITTED,
        )
        .order_by(ListeningAttempt.submitted_at.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    if last:
        last_submitted = {
            "id": str(last.id),
            "percentage": float(last.percentage) if last.percentage is not None else None,
            "passed": last.passed,
            "submitted_at": (
                last.submitted_at.isoformat() if last.submitted_at else None
            ),
        }

    if mode == MODE_PRACTICE:
        available = config.practice_enabled and access.practice_enabled
        return {
            "exam_type": ExamType.LISTENING_PRACTICE.value,
            "mode": MODE_PRACTICE,
            "is_available": available,
            "has_open_attempt": open_attempt is not None,
            "open_attempt_id": str(open_attempt.id) if open_attempt else None,
            "submitted_count": submitted_count,
            "max_attempts": None,
            "can_start_new": available,
            "last_submitted": last_submitted,
        }

    available = config.is_enabled and access.is_enabled
    return {
        "exam_type": ExamType.LISTENING_PRACTICE.value,
        "mode": MODE_EXAM,
        "is_available": available,
        "has_open_attempt": open_attempt is not None,
        "open_attempt_id": str(open_attempt.id) if open_attempt else None,
        "submitted_count": submitted_count,
        "max_attempts": access.allowed_attempts,
        "can_start_new": available
        and (
            open_attempt is not None
            or submitted_count < access.allowed_attempts
        ),
        "last_submitted": last_submitted,
    }


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
        delete(ListeningAttempt).where(
            ListeningAttempt.user_id == user_id,
            ListeningAttempt.mode == mode,
        )
    )
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.LISTENING_PRACTICE,
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
    result = await session.execute(
        select(ListeningAttempt)
        .options(
            selectinload(ListeningAttempt.questions),
            selectinload(ListeningAttempt.user),
        )
        .where(ListeningAttempt.id == attempt_id)
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
    question.is_correct = correct
    question.graded_at = datetime.now(UTC)
    recompute_attempt_from_grades(attempt)
    await session.flush()
    return serialize_result(attempt, student=attempt.user, include_review=True)
