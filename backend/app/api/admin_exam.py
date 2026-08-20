import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models import (
    Attempt,
    AttemptStatus,
    ExamAccess,
    ExamType,
    PastSimpleAttempt,
    User,
    Verb,
)
from app.models.enums import ReviewPolicy, UserRole
from app.services import exam_service, user_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/verbs")
async def list_verbs(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Verb)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            Verb.base_display.ilike(term)
            | Verb.past_display.ilike(term)
            | Verb.spanish_prompt.ilike(term)
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(
        query.order_by(Verb.source_order).offset((page - 1) * page_size).limit(page_size)
    )
    verbs = result.scalars().all()
    return {
        "items": [
            {
                "id": str(v.id),
                "source_order": v.source_order,
                "base_display": v.base_display,
                "past_display": v.past_display,
                "spanish_display": v.spanish_display,
                "spanish_prompt": v.spanish_prompt,
                "is_active": v.is_active,
            }
            for v in verbs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/verbs/{verb_id}")
async def update_verb(
    verb_id: uuid.UUID,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Verb).where(Verb.id == verb_id))
    verb = result.scalar_one_or_none()
    if verb is None:
        from app.core.errors import AppError

        raise AppError("NOT_FOUND", "Verbo no encontrado", status_code=404)
    if "is_active" in body:
        verb.is_active = bool(body["is_active"])
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="VERB_UPDATED",
        target_type="verb",
        target_id=str(verb.id),
    )
    await db.commit()
    return {"id": str(verb.id), "is_active": verb.is_active}


@router.get("/exam-config")
async def get_exam_config_admin(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await exam_service.get_exam_config(db)
    return {
        "exam_type": "verb_exam",
        "is_enabled": config.is_enabled,
        "question_count": config.question_count,
        "passing_percentage": config.passing_percentage,
        "duration_minutes": config.duration_minutes,
        "max_attempts": config.max_attempts,
        "review_policy": config.review_policy.value,
    }


@router.patch("/exam-config")
async def update_exam_config(
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await exam_service.get_exam_config(db)
    if "is_enabled" in body:
        config.is_enabled = bool(body["is_enabled"])
    if "passing_percentage" in body:
        config.passing_percentage = int(body["passing_percentage"])
    if "duration_minutes" in body:
        config.duration_minutes = body["duration_minutes"]
    if "max_attempts" in body:
        new_max_attempts = int(body["max_attempts"])
        if new_max_attempts < 1:
            raise AppError(
                "INVALID_CONFIG",
                "Debe permitirse al menos un intento.",
                status_code=400,
            )
        previous_max_attempts = config.max_attempts
        config.max_attempts = new_max_attempts
        await db.execute(
            update(ExamAccess)
            .where(
                ExamAccess.exam_type == ExamType.VERB_EXAM.value,
                ExamAccess.allowed_attempts == previous_max_attempts,
            )
            .values(allowed_attempts=new_max_attempts)
        )
    if "review_policy" in body:
        config.review_policy = ReviewPolicy(body["review_policy"])
    config.updated_by = admin.id
    await log_audit(db, actor_user_id=admin.id, action="EXAM_CONFIG_UPDATED")
    await db.commit()
    return await get_exam_config_admin(_admin=admin, db=db)


@router.get("/dashboard")
async def dashboard(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.enums import UserRole

    active_students = (
        await db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.STUDENT, User.is_active.is_(True)
            )
        )
    ).scalar_one()
    finished = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(
                Attempt.status == AttemptStatus.SUBMITTED
            )
        )
    ).scalar_one()
    avg = (
        await db.execute(
            select(func.avg(Attempt.percentage)).where(Attempt.status == AttemptStatus.SUBMITTED)
        )
    ).scalar_one()
    passed = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(
                Attempt.status == AttemptStatus.SUBMITTED, Attempt.passed.is_(True)
            )
        )
    ).scalar_one()
    past_finished = (
        await db.execute(
            select(func.count()).select_from(PastSimpleAttempt).where(
                PastSimpleAttempt.mode == "exam",
                PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    past_avg = (
        await db.execute(
            select(func.avg(PastSimpleAttempt.percentage)).where(
                PastSimpleAttempt.mode == "exam",
                PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    past_passed = (
        await db.execute(
            select(func.count()).select_from(PastSimpleAttempt).where(
                PastSimpleAttempt.mode == "exam",
                PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
                PastSimpleAttempt.passed.is_(True),
            )
        )
    ).scalar_one()
    return {
        "active_students": active_students,
        "finished_attempts": finished,
        "average_percentage": float(avg) if avg else None,
        "passed_count": passed,
        "past_simple_finished_attempts": past_finished,
        "past_simple_average_percentage": float(past_avg) if past_avg else None,
        "past_simple_passed_count": past_passed,
    }


@router.get("/attempts")
async def list_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt, User)
        .join(User, User.id == Attempt.user_id)
        .order_by(Attempt.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.all()
    return {
        "items": [
            {
                "id": str(a.id),
                "exam_type": ExamType.VERB_EXAM.value,
                "exam_name": "Verb Exam",
                "student_id": str(u.id),
                "student_username": u.username,
                "student_name": u.full_name,
                "status": a.status.value,
                "percentage": float(a.percentage) if a.percentage is not None else None,
                "passed": a.passed,
                "started_at": a.started_at.isoformat(),
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            }
            for a, u in rows
        ],
        "page": page,
        "page_size": page_size,
    }


@router.get("/attempts/{attempt_id}")
async def get_attempt_admin(
    attempt_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt, User)
        .join(User, User.id == Attempt.user_id)
        .options(selectinload(Attempt.questions))
        .where(Attempt.id == attempt_id)
    )
    row = result.one_or_none()
    if row is None:
        raise AppError("NOT_FOUND", "Intento no encontrado", status_code=404)
    attempt, user = row
    return exam_service.serialize_admin_attempt_report(attempt, user)


class VerbGradeOverrideBody(BaseModel):
    field: str
    correct: bool


@router.patch("/attempts/{attempt_id}/questions/{question_id}/grade")
async def override_verb_exam_grade(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: VerbGradeOverrideBody,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await exam_service.override_question_field_grade(
        db,
        attempt_id=attempt_id,
        question_id=question_id,
        field=body.field,
        correct=body.correct,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="VERB_EXAM_GRADE_OVERRIDE",
        target_type="attempt_question",
        target_id=str(question_id),
        metadata={
            "attempt_id": str(attempt_id),
            "field": body.field.upper(),
            "correct": body.correct,
        },
    )
    await db.commit()
    return data


@router.post("/users/{user_id}/allow-new-attempt")
async def allow_new_attempt(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado", status_code=404)
    access = await exam_service.allow_new_attempt(db, user_id, actor_id=admin.id)
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="ALLOW_NEW_ATTEMPT",
        target_type="user",
        target_id=str(user_id),
        metadata={"allowed_attempts": access.allowed_attempts},
    )
    await db.commit()
    return {
        "status": "ok",
        "allowed_attempts": access.allowed_attempts,
    }
