import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models import (
    Attempt,
    AttemptStatus,
    ExamType,
    PastSimpleAttempt,
    PastSimpleQuestion,
    ReviewPolicy,
    User,
    UserRole,
)
from app.schemas.past_simple import ExamAccessUpdate, PastSimpleConfigUpdate
from app.services import exam_access_service, exam_service, past_simple_service, user_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["admin-past-simple"])


def _parse_exam_type(value: str) -> ExamType:
    try:
        return ExamType(value)
    except ValueError as exc:
        raise AppError("INVALID_EXAM_TYPE", "Tipo de examen inválido.", status_code=400) from exc


@router.get("/past-simple/config")
async def get_config(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await past_simple_service.get_visible_config(db)


@router.patch("/past-simple/config")
async def update_config(
    body: PastSimpleConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await past_simple_service.get_config(db)
    changes = body.model_dump(exclude_unset=True)
    if "is_enabled" in changes:
        config.is_enabled = changes["is_enabled"]
    if "practice_enabled" in changes:
        config.practice_enabled = changes["practice_enabled"]
    if "passing_percentage" in changes:
        config.passing_percentage = changes["passing_percentage"]
    if "duration_minutes" in changes:
        config.duration_minutes = changes["duration_minutes"]
    if "review_policy" in changes:
        config.review_policy = ReviewPolicy(changes["review_policy"])
    config.updated_by = admin.id
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="PAST_SIMPLE_CONFIG_UPDATED",
        target_type="exam",
        target_id=ExamType.PAST_SIMPLE_EXAM.value,
        metadata=changes,
    )
    await db.commit()
    return await past_simple_service.get_visible_config(db)


@router.get("/past-simple/questions")
async def list_questions(
    topic: str | None = None,
    active: bool | None = None,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(PastSimpleQuestion)
    if topic:
        query = query.where(PastSimpleQuestion.topic == topic)
    if active is not None:
        query = query.where(PastSimpleQuestion.active == active)
    result = await db.execute(
        query.order_by(PastSimpleQuestion.topic, PastSimpleQuestion.stable_key)
    )
    return {
        "items": [
            {
                "id": str(question.id),
                "stable_key": question.stable_key,
                "topic": question.topic,
                "question_type": question.question_type,
                "instruction": question.instruction,
                "question": question.question,
                "options": question.options,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
                "points": question.points,
                "active": question.active,
            }
            for question in result.scalars()
        ]
    }


@router.patch("/past-simple/questions/{question_id}")
async def update_question(
    question_id: uuid.UUID,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PastSimpleQuestion).where(PastSimpleQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada.", status_code=404)
    if "active" in body:
        question.active = bool(body["active"])
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="PAST_SIMPLE_QUESTION_UPDATED",
        target_type="past_simple_question",
        target_id=str(question.id),
    )
    await db.commit()
    return {"id": str(question.id), "active": question.active}


@router.get("/past-simple/attempts")
async def list_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: uuid.UUID | None = None,
    status: AttemptStatus | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PastSimpleAttempt, User)
        .join(User, User.id == PastSimpleAttempt.user_id)
        .where(PastSimpleAttempt.mode == past_simple_service.MODE_EXAM)
    )
    if student_id:
        query = query.where(PastSimpleAttempt.user_id == student_id)
    if status:
        query = query.where(PastSimpleAttempt.status == status)
    if date_from:
        query = query.where(PastSimpleAttempt.started_at >= date_from)
    if date_to:
        query = query.where(PastSimpleAttempt.started_at <= date_to)

    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    result = await db.execute(
        query.order_by(PastSimpleAttempt.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [
            {
                "id": str(attempt.id),
                "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
                "mode": attempt.mode,
                "exam_name": "Past Simple Exam",
                "student_id": str(user.id),
                "student_username": user.username,
                "student_name": user.full_name,
                "attempt_number": attempt.attempt_number,
                "status": attempt.status.value,
                "percentage": (
                    float(attempt.percentage)
                    if attempt.percentage is not None
                    else None
                ),
                "score_out_of_ten": (
                    float(attempt.score_out_of_ten)
                    if attempt.score_out_of_ten is not None
                    else None
                ),
                "passed": attempt.passed,
                "started_at": attempt.started_at.isoformat(),
                "submitted_at": (
                    attempt.submitted_at.isoformat()
                    if attempt.submitted_at
                    else None
                ),
            }
            for attempt, user in result.all()
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/past-simple/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PastSimpleAttempt)
        .options(
            selectinload(PastSimpleAttempt.questions),
            selectinload(PastSimpleAttempt.user),
        )
        .where(PastSimpleAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado.", status_code=404)
    return past_simple_service.serialize_result(
        attempt,
        student=attempt.user,
        include_review=True,
    )


@router.get("/users/{user_id}/exam-access")
async def get_user_exam_access(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado.", status_code=404)
    availability = await exam_access_service.global_availability(db)
    items = []
    for exam_type in ExamType:
        access = await exam_access_service.get_or_create_access(
            db,
            user_id=user_id,
            exam_type=exam_type,
        )
        if exam_type == ExamType.VERB_EXAM:
            submitted = (
                await db.execute(
                    select(func.count())
                    .select_from(Attempt)
                    .where(
                        Attempt.user_id == user_id,
                        Attempt.status == AttemptStatus.SUBMITTED,
                    )
                )
            ).scalar_one()
            practice_submitted = 0
        else:
            submitted = (
                await db.execute(
                    select(func.count())
                    .select_from(PastSimpleAttempt)
                    .where(
                        PastSimpleAttempt.user_id == user_id,
                        PastSimpleAttempt.mode == past_simple_service.MODE_EXAM,
                        PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
                    )
                )
            ).scalar_one()
            practice_submitted = (
                await db.execute(
                    select(func.count())
                    .select_from(PastSimpleAttempt)
                    .where(
                        PastSimpleAttempt.user_id == user_id,
                        PastSimpleAttempt.mode == past_simple_service.MODE_PRACTICE,
                        PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
                    )
                )
            ).scalar_one()
        items.append(
            {
                "exam_type": exam_type.value,
                "globally_enabled": availability[exam_type.value],
                "is_enabled": access.is_enabled,
                "practice_enabled": access.practice_enabled,
                "allowed_attempts": access.allowed_attempts,
                "submitted_attempts": submitted,
                "remaining_attempts": max(0, access.allowed_attempts - submitted),
                "practice_submitted_attempts": practice_submitted,
            }
        )
    await db.commit()
    return {"items": items}


@router.patch("/users/{user_id}/exam-access/{exam_type}")
async def update_user_exam_access(
    user_id: uuid.UUID,
    exam_type: str,
    body: ExamAccessUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado.", status_code=404)
    parsed_type = _parse_exam_type(exam_type)
    access = await exam_access_service.set_student_access(
        db,
        user_id=user_id,
        exam_type=parsed_type,
        actor_id=admin.id,
        is_enabled=body.is_enabled,
        practice_enabled=body.practice_enabled,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="EXAM_ACCESS_UPDATED",
        target_type="user",
        target_id=str(user_id),
        metadata={
            "exam_type": parsed_type.value,
            "is_enabled": body.is_enabled,
            "practice_enabled": body.practice_enabled,
        },
    )
    await db.commit()
    return {
        "exam_type": parsed_type.value,
        "is_enabled": access.is_enabled,
        "practice_enabled": access.practice_enabled,
        "allowed_attempts": access.allowed_attempts,
    }


@router.post("/users/{user_id}/exams/{exam_type}/allow-new-attempt")
async def allow_new_attempt(
    user_id: uuid.UUID,
    exam_type: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    mode: str = Query("exam", pattern="^(exam|practice)$"),
):
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado.", status_code=404)
    parsed_type = _parse_exam_type(exam_type)
    if parsed_type == ExamType.VERB_EXAM and mode == "practice":
        raise AppError(
            "INVALID_MODE",
            "Verb Exam no tiene modo práctica.",
            status_code=400,
        )
    if parsed_type == ExamType.VERB_EXAM:
        await exam_service.allow_new_attempt(db, user_id, actor_id=admin.id)
    else:
        await exam_access_service.authorize_new_attempt(
            db,
            user_id=user_id,
            exam_type=parsed_type,
            actor_id=admin.id,
            mode=mode,
        )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="ALLOW_NEW_ATTEMPT",
        target_type="user",
        target_id=str(user_id),
        metadata={"exam_type": parsed_type.value, "mode": mode},
    )
    await db.commit()
    return {"status": "ok", "exam_type": parsed_type.value, "mode": mode}


@router.post("/users/{user_id}/exams/{exam_type}/reset")
async def reset_exam_progress(
    user_id: uuid.UUID,
    exam_type: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    mode: str = Query("exam", pattern="^(exam|practice)$"),
):
    """Reset uniforme por módulo: habilita cupo en 1 e elimina intentos del modo."""
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado.", status_code=404)
    parsed_type = _parse_exam_type(exam_type)
    if parsed_type == ExamType.VERB_EXAM:
        if mode != "exam":
            raise AppError(
                "INVALID_MODE",
                "Verb Exam no tiene modo práctica.",
                status_code=400,
            )
        result = await exam_service.reset_student_progress(
            db,
            user_id=user_id,
            actor_id=admin.id,
        )
        action = "VERB_EXAM_PROGRESS_RESET"
    else:
        result = await past_simple_service.reset_student_progress(
            db,
            user_id=user_id,
            actor_id=admin.id,
            mode=mode,
        )
        action = "PAST_SIMPLE_PROGRESS_RESET"
    await log_audit(
        db,
        actor_user_id=admin.id,
        action=action,
        target_type="user",
        target_id=str(user_id),
        metadata={"exam_type": parsed_type.value, **result},
    )
    await db.commit()
    return {"status": "ok", "exam_type": parsed_type.value, **result}


@router.post("/users/{user_id}/exams/past_simple_exam/reset")
async def reset_past_simple_progress(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    mode: str = Query("exam", pattern="^(exam|practice)$"),
):
    """Compatibilidad con clientes anteriores; usa el reset genérico."""
    return await reset_exam_progress(
        user_id=user_id,
        exam_type=ExamType.PAST_SIMPLE_EXAM.value,
        admin=admin,
        db=db,
        mode=mode,
    )
