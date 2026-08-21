import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models import (
    AttemptStatus,
    ExamType,
    PresentPerfectAttempt,
    PresentPerfectQuestion,
    ReviewPolicy,
    User,
)
from app.schemas.present_perfect import PresentPerfectConfigUpdate
from app.services import present_perfect_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["admin-present-perfect"])


@router.get("/present-perfect/config")
async def get_config(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await present_perfect_service.get_visible_config(db)


@router.patch("/present-perfect/config")
async def update_config(
    body: PresentPerfectConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await present_perfect_service.get_config(db)
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
        action="PRESENT_PERFECT_CONFIG_UPDATED",
        target_type="exam",
        target_id=ExamType.PRESENT_PERFECT_EXAM.value,
        metadata=changes,
    )
    await db.commit()
    return await present_perfect_service.get_visible_config(db)


@router.get("/present-perfect/questions")
async def list_questions(
    topic: str | None = None,
    active: bool | None = None,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(PresentPerfectQuestion)
    if topic:
        query = query.where(PresentPerfectQuestion.topic == topic)
    if active is not None:
        query = query.where(PresentPerfectQuestion.active == active)
    result = await db.execute(
        query.order_by(PresentPerfectQuestion.topic, PresentPerfectQuestion.stable_key)
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


@router.patch("/present-perfect/questions/{question_id}")
async def update_question(
    question_id: uuid.UUID,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PresentPerfectQuestion).where(PresentPerfectQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    if question is None:
        raise AppError("NOT_FOUND", "Pregunta no encontrada.", status_code=404)
    if "active" in body:
        question.active = bool(body["active"])
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="PRESENT_PERFECT_QUESTION_UPDATED",
        target_type="present_perfect_question",
        target_id=str(question.id),
    )
    await db.commit()
    return {"id": str(question.id), "active": question.active}


@router.get("/present-perfect/attempts")
async def list_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: uuid.UUID | None = None,
    status: AttemptStatus | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    mode: str = Query("exam", pattern="^(exam|practice)$"),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PresentPerfectAttempt, User)
        .join(User, User.id == PresentPerfectAttempt.user_id)
        .where(PresentPerfectAttempt.mode == mode)
    )
    if student_id:
        query = query.where(PresentPerfectAttempt.user_id == student_id)
    if status:
        query = query.where(PresentPerfectAttempt.status == status)
    if date_from:
        query = query.where(PresentPerfectAttempt.started_at >= date_from)
    if date_to:
        query = query.where(PresentPerfectAttempt.started_at <= date_to)

    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar_one()
    result = await db.execute(
        query.order_by(PresentPerfectAttempt.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "items": [
            {
                "id": str(attempt.id),
                "exam_type": ExamType.PRESENT_PERFECT_EXAM.value,
                "mode": attempt.mode,
                "exam_name": (
                    "Present Perfect Practice"
                    if mode == present_perfect_service.MODE_PRACTICE
                    else "Present Perfect Exam"
                ),
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


@router.get("/present-perfect/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PresentPerfectAttempt)
        .options(
            selectinload(PresentPerfectAttempt.questions),
            selectinload(PresentPerfectAttempt.user),
        )
        .where(PresentPerfectAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise AppError("NOT_FOUND", "Intento no encontrado.", status_code=404)
    return present_perfect_service.serialize_result(
        attempt,
        student=attempt.user,
        include_review=True,
    )


class GradeOverrideBody(BaseModel):
    correct: bool


@router.patch("/present-perfect/attempts/{attempt_id}/questions/{question_id}/grade")
async def override_present_perfect_grade(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: GradeOverrideBody,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await present_perfect_service.override_question_grade(
        db,
        attempt_id=attempt_id,
        question_id=question_id,
        correct=body.correct,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="PRESENT_PERFECT_GRADE_OVERRIDE",
        target_type="present_perfect_attempt_question",
        target_id=str(question_id),
        metadata={"attempt_id": str(attempt_id), "correct": body.correct},
    )
    await db.commit()
    return data

