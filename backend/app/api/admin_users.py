import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models import Attempt, AttemptStatus, ExamType, PastSimpleAttempt, User, UserRole
from app.schemas.user import (
    AdminResetPasswordRequest,
    AdminUserCreate,
    AdminUserCreateResponse,
    AdminUserResponse,
    AdminUserUpdate,
    PaginatedUsersResponse,
    ResetPasswordResponse,
)
from app.services import exam_access_service, exam_service, user_service

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: UserRole | None = None,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users, total = await user_service.list_users(
        db, page=page, page_size=page_size, search=search, role=role
    )
    student_ids = [u.id for u in users if u.role == UserRole.STUDENT]
    attempt_stats = await exam_service.get_student_attempt_stats(db, student_ids)
    access_map = await exam_access_service.get_student_access_map(db, student_ids)
    past_counts_result = await db.execute(
        select(PastSimpleAttempt.user_id, func.count())
        .where(
            PastSimpleAttempt.user_id.in_(student_ids),
            PastSimpleAttempt.mode == "exam",
            PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
        )
        .group_by(PastSimpleAttempt.user_id)
    )
    past_counts = {row[0]: row[1] for row in past_counts_result.all()}
    items: list[AdminUserResponse] = []
    for user in users:
        base = AdminUserResponse.model_validate(user)
        if user.role == UserRole.STUDENT and user.id in attempt_stats:
            base = base.model_copy(
                update={
                    **attempt_stats[user.id],
                    "exam_access": [
                        {
                            "exam_type": access.exam_type,
                            "is_enabled": access.is_enabled,
                            "allowed_attempts": access.allowed_attempts,
                            "submitted_attempts": (
                                attempt_stats[user.id]["attempts_used"]
                                if access.exam_type == ExamType.VERB_EXAM.value
                                else past_counts.get(user.id, 0)
                            ),
                            "remaining_attempts": max(
                                0,
                                access.allowed_attempts
                                - (
                                    attempt_stats[user.id]["attempts_used"]
                                    if access.exam_type
                                    == ExamType.VERB_EXAM.value
                                    else past_counts.get(user.id, 0)
                                ),
                            ),
                        }
                        for access in access_map.get(user.id, {}).values()
                    ],
                }
            )
        items.append(base)
    return PaginatedUsersResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AdminUserCreateResponse, status_code=201)
async def create_user(
    body: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user, temp_password = await user_service.create_user(
        db,
        actor_id=admin.id,
        username=body.username,
        full_name=body.full_name,
        role=body.role,
        password=body.password,
    )
    return AdminUserCreateResponse(
        user=AdminUserResponse.model_validate(user),
        temporary_password=temp_password,
    )


@router.get("/{user_id}/report")
async def student_report(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    if user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado", status_code=404)

    result = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user_id)
        .order_by(Attempt.started_at.desc())
    )
    attempts = result.scalars().all()
    past_result = await db.execute(
        select(PastSimpleAttempt)
        .where(
            PastSimpleAttempt.user_id == user_id,
            PastSimpleAttempt.mode == "exam",
        )
        .order_by(PastSimpleAttempt.started_at.desc())
    )
    past_attempts = past_result.scalars().all()
    stats = await exam_service.get_student_attempt_stats(db, [user_id])
    attempt_summary = stats.get(user_id, {})

    return {
        "student": AdminUserResponse.model_validate(user).model_copy(update=attempt_summary),
        "attempts": [
            {
                "id": str(a.id),
                "exam_type": ExamType.VERB_EXAM.value,
                "exam_name": "Verb Exam",
                "status": a.status.value,
                "started_at": a.started_at.isoformat(),
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "percentage": float(a.percentage) if a.percentage is not None else None,
                "passed": a.passed,
                "correct_fields": a.correct_fields,
                "total_fields": a.total_fields,
                "fully_correct_questions": a.fully_correct_questions,
            }
            for a in attempts
        ],
        "past_simple_attempts": [
            {
                "id": str(attempt.id),
                "exam_type": ExamType.PAST_SIMPLE_EXAM.value,
                "exam_name": "Past Simple Exam",
                "attempt_number": attempt.attempt_number,
                "status": attempt.status.value,
                "started_at": attempt.started_at.isoformat(),
                "submitted_at": (
                    attempt.submitted_at.isoformat()
                    if attempt.submitted_at
                    else None
                ),
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
                "correct_answers": attempt.correct_answers,
                "incorrect_answers": attempt.incorrect_answers,
                "unanswered_answers": attempt.unanswered_answers,
                "total_questions": attempt.total_questions,
            }
            for attempt in past_attempts
        ],
    }


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    return AdminUserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    updated = await user_service.update_user(
        db,
        actor_id=admin.id,
        user=user,
        username=body.username,
        full_name=body.full_name,
        password=body.password,
        is_active=body.is_active,
    )
    return AdminUserResponse.model_validate(updated)


@router.post("/import")
async def import_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    raw = (await file.read()).decode("utf-8-sig")
    if len(raw) > 512_000:
        from app.core.errors import AppError

        raise AppError("FILE_TOO_LARGE", "El archivo CSV es demasiado grande.", status_code=400)
    created = await user_service.import_users_csv(db, actor_id=admin.id, content=raw)
    return {
        "imported": len(created),
        "users": [
            {
                "username": user.username,
                "full_name": user.full_name,
                "temporary_password": temp,
            }
            for user, temp in created
        ],
    }


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    body: AdminResetPasswordRequest | None = None,
):
    user = await user_service.get_user(db, user_id)
    temp_password = await user_service.reset_password(
        db,
        actor_id=admin.id,
        user=user,
        password=body.password if body else None,
    )
    return ResetPasswordResponse(temporary_password=temp_password)
