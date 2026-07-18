import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import Attempt, AttemptStatus, User, Verb
from app.models.enums import ReviewPolicy
from app.services import exam_service
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
    if "passing_percentage" in body:
        config.passing_percentage = int(body["passing_percentage"])
    if "duration_minutes" in body:
        config.duration_minutes = body["duration_minutes"]
    if "max_attempts" in body:
        config.max_attempts = int(body["max_attempts"])
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
    return {
        "active_students": active_students,
        "finished_attempts": finished,
        "average_percentage": float(avg) if avg else None,
        "passed_count": passed,
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
        from app.core.errors import AppError

        raise AppError("NOT_FOUND", "Intento no encontrado", status_code=404)
    attempt, user = row
    return exam_service.serialize_admin_attempt_report(attempt, user)


@router.post("/users/{user_id}/allow-new-attempt")
async def allow_new_attempt(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await exam_service.allow_new_attempt(db, user_id)
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="ALLOW_NEW_ATTEMPT",
        target_type="user",
        target_id=str(user_id),
    )
    return {"status": "ok"}
