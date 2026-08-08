import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import (
    AttemptStatus,
    ExamType,
    PastSimpleAttempt,
    PastSimpleAttemptQuestion,
    PastSimpleConfig,
    PastSimpleQuestion,
    PastSimpleQuestionType,
    User,
)
from app.services import exam_access_service
from app.services.past_simple_engine import (
    select_balanced_questions,
    shuffle_order_words,
)
from app.services.past_simple_grading import (
    automatic_observation,
    grade_attempt,
    grade_question,
    topic_performance,
)


async def get_config(session: AsyncSession) -> PastSimpleConfig:
    result = await session.execute(select(PastSimpleConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        raise AppError(
            "CONFIG_MISSING",
            "Configuración de Past Simple Exam no encontrada.",
            status_code=500,
        )
    return config


MODE_EXAM = "exam"
MODE_PRACTICE = "practice"


async def get_visible_config(session: AsyncSession) -> dict:
    config = await get_config(session)
    active_count = (
        await session.execute(
            select(func.count())
            .select_from(PastSimpleQuestion)
            .where(PastSimpleQuestion.active.is_(True))
        )
    ).scalar_one()
    return {
        "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
        "title": "Past Simple Exam",
        "is_enabled": config.is_enabled,
        "practice_enabled": config.practice_enabled,
        "question_count": config.question_count,
        "question_bank_size": active_count,
        "passing_percentage": config.passing_percentage,
        "duration_minutes": config.duration_minutes,
        "review_policy": config.review_policy.value,
    }


async def get_open_attempt(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    mode: str = MODE_EXAM,
) -> PastSimpleAttempt | None:
    result = await session.execute(
        select(PastSimpleAttempt)
        .options(selectinload(PastSimpleAttempt.questions))
        .where(
            PastSimpleAttempt.user_id == user_id,
            PastSimpleAttempt.mode == mode,
            PastSimpleAttempt.status == AttemptStatus.IN_PROGRESS,
        )
        .with_for_update()
    )
    attempt = result.scalar_one_or_none()
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
) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(PastSimpleAttempt)
        .where(
            PastSimpleAttempt.user_id == user_id,
            PastSimpleAttempt.mode == mode,
            PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
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
) -> PastSimpleAttempt:
    result = await session.execute(
        select(PastSimpleQuestion).where(PastSimpleQuestion.active.is_(True))
    )
    try:
        selected = select_balanced_questions(list(result.scalars()))
    except ValueError as exc:
        raise AppError(
            "INSUFFICIENT_QUESTIONS",
            str(exc),
            status_code=503,
        ) from exc

    max_number = (
        await session.execute(
            select(func.max(PastSimpleAttempt.attempt_number)).where(
                PastSimpleAttempt.user_id == user.id,
                PastSimpleAttempt.mode == mode,
            )
        )
    ).scalar_one()
    expires_at = (
        datetime.now(UTC) + timedelta(minutes=duration_minutes)
        if duration_minutes
        else None
    )
    attempt = PastSimpleAttempt(
        id=uuid.uuid4(),
        user_id=user.id,
        mode=mode,
        attempt_number=(max_number or 0) + 1,
        config_snapshot={
            "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
            "mode": mode,
            "title": title,
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
        snapshot_question = (
            shuffle_order_words(
                question.question,
                correct_answer=question.correct_answer,
            )
            if question.question_type == PastSimpleQuestionType.ORDER_WORDS.value
            else question.question
        )
        session.add(
            PastSimpleAttemptQuestion(
                id=uuid.uuid4(),
                attempt_id=attempt.id,
                source_question_id=question.id,
                position=position,
                snapshot_topic=question.topic,
                snapshot_question_type=question.question_type,
                snapshot_instruction=question.instruction,
                snapshot_question=snapshot_question,
                snapshot_options=question.options,
                snapshot_correct_answer=question.correct_answer,
                snapshot_accepted_answers=question.accepted_answers,
                snapshot_explanation=question.explanation,
                snapshot_points=question.points,
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
) -> PastSimpleAttempt:
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
        exam_type=ExamType.PAST_SIMPLE_EXAM,
    )
    existing = await get_open_attempt(session, user.id, mode=MODE_EXAM)
    if existing:
        return existing

    submitted_count = await _submitted_count(session, user.id, mode=MODE_EXAM)
    if submitted_count >= access.allowed_attempts:
        raise AppError(
            "MAX_ATTEMPTS_REACHED",
            "Ya completaste Past Simple Exam. Contacta al profesor para un nuevo intento.",
            status_code=403,
        )

    config = await get_config(session)
    return await _create_attempt_with_questions(
        session,
        user=user,
        mode=MODE_EXAM,
        title="Past Simple Exam",
        review_policy=config.review_policy.value,
        duration_minutes=config.duration_minutes,
        passing_percentage=config.passing_percentage,
        question_count=config.question_count,
    )


async def create_or_get_practice(
    session: AsyncSession,
    user: User,
) -> PastSimpleAttempt:
    if user.must_change_password:
        raise AppError(
            "PASSWORD_CHANGE_REQUIRED",
            "Debes cambiar tu contraseña antes de iniciar la práctica.",
            status_code=403,
        )

    await session.execute(select(User).where(User.id == user.id).with_for_update())
    config = await get_config(session)
    access = await exam_access_service.get_or_create_access(
        session,
        user_id=user.id,
        exam_type=ExamType.PAST_SIMPLE_EXAM,
    )
    if not config.practice_enabled or not access.is_enabled:
        raise AppError(
            "PRACTICE_NOT_AVAILABLE",
            "La práctica de Past Simple no está habilitada para tu cuenta.",
            status_code=403,
        )

    existing = await get_open_attempt(session, user.id, mode=MODE_PRACTICE)
    if existing:
        return existing

    return await _create_attempt_with_questions(
        session,
        user=user,
        mode=MODE_PRACTICE,
        title="Past Simple Practice",
        review_policy="FULL",
        duration_minutes=None,
        passing_percentage=config.passing_percentage,
        question_count=config.question_count,
    )


async def get_attempt_for_user(
    session: AsyncSession,
    *,
    attempt_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PastSimpleAttempt:
    result = await session.execute(
        select(PastSimpleAttempt)
        .options(selectinload(PastSimpleAttempt.questions))
        .where(
            PastSimpleAttempt.id == attempt_id,
            PastSimpleAttempt.user_id == user_id,
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
) -> PastSimpleAttempt:
    result = await session.execute(
        select(PastSimpleAttempt)
        .options(selectinload(PastSimpleAttempt.questions))
        .where(
            PastSimpleAttempt.id == attempt_id,
            PastSimpleAttempt.user_id == user_id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado.", status_code=404)
    return attempt


def serialize_question(
    question: PastSimpleAttemptQuestion,
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
    attempt: PastSimpleAttempt,
    *,
    include_grades: bool,
) -> dict:
    mode = attempt.mode or MODE_EXAM
    is_practice = mode == MODE_PRACTICE
    return {
        "id": str(attempt.id),
        "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
        "mode": mode,
        "exam_name": "Past Simple Practice" if is_practice else "Past Simple Exam",
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
    attempt: PastSimpleAttempt,
    question_id: uuid.UUID,
    answer: str | None,
) -> PastSimpleAttemptQuestion:
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
    attempt: PastSimpleAttempt,
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
    attempt: PastSimpleAttempt,
) -> PastSimpleAttempt:
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
    attempt: PastSimpleAttempt,
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
        exam_type=ExamType.PAST_SIMPLE_EXAM,
    )
    open_attempt = await get_open_attempt(session, user_id, mode=mode)
    submitted_count = await _submitted_count(session, user_id, mode=mode)
    last_submitted = None
    result = await session.execute(
        select(PastSimpleAttempt)
        .where(
            PastSimpleAttempt.user_id == user_id,
            PastSimpleAttempt.mode == mode,
            PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
        )
        .order_by(PastSimpleAttempt.submitted_at.desc())
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
        available = config.practice_enabled and access.is_enabled
        return {
            "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
            "mode": MODE_PRACTICE,
            "is_available": available,
            "has_open_attempt": open_attempt is not None,
            "open_attempt_id": str(open_attempt.id) if open_attempt else None,
            "submitted_count": submitted_count,
            "max_attempts": None,
            "can_start_new": available,
            "last_submitted": last_submitted,
            "question_bank_size": (
                await session.execute(
                    select(func.count())
                    .select_from(PastSimpleQuestion)
                    .where(PastSimpleQuestion.active.is_(True))
                )
            ).scalar_one(),
        }

    available = config.is_enabled and access.is_enabled
    return {
        "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
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
