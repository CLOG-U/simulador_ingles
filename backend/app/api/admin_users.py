import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.errors import AppError
from app.models import (
    Attempt,
    AttemptStatus,
    ExamType,
    ListeningAttempt,
    PastSimpleAttempt,
    PresentPerfectAttempt,
    PresentSimpleAttempt,
    User,
    UserRole,
    VerbBaseAttempt,
)
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
        select(
            PastSimpleAttempt.user_id,
            PastSimpleAttempt.mode,
            func.count(),
        )
        .where(
            PastSimpleAttempt.user_id.in_(student_ids),
            PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
        )
        .group_by(PastSimpleAttempt.user_id, PastSimpleAttempt.mode)
    )
    past_exam_counts: dict = {}
    past_practice_counts: dict = {}
    for user_id, mode, count in past_counts_result.all():
        if mode == "practice":
            past_practice_counts[user_id] = count
        else:
            past_exam_counts[user_id] = count

    verb_base_exam_counts: dict = {}
    verb_base_practice_counts: dict = {}
    if student_ids:
        verb_base_counts_result = await db.execute(
            select(VerbBaseAttempt.user_id, VerbBaseAttempt.mode, func.count())
            .where(
                VerbBaseAttempt.user_id.in_(student_ids),
                VerbBaseAttempt.status == AttemptStatus.SUBMITTED,
            )
            .group_by(VerbBaseAttempt.user_id, VerbBaseAttempt.mode)
        )
        for user_id, mode, count in verb_base_counts_result.all():
            if mode == "practice":
                verb_base_practice_counts[user_id] = count
            else:
                verb_base_exam_counts[user_id] = count

    present_exam_counts: dict = {}
    present_practice_counts: dict = {}
    present_perfect_exam_counts: dict = {}
    present_perfect_practice_counts: dict = {}
    listening_exam_counts: dict = {}
    listening_practice_counts: dict = {}
    if student_ids:
        present_counts_result = await db.execute(
            select(
                PresentSimpleAttempt.user_id,
                PresentSimpleAttempt.mode,
                func.count(),
            )
            .where(
                PresentSimpleAttempt.user_id.in_(student_ids),
                PresentSimpleAttempt.status == AttemptStatus.SUBMITTED,
            )
            .group_by(PresentSimpleAttempt.user_id, PresentSimpleAttempt.mode)
        )
        for user_id, mode, count in present_counts_result.all():
            if mode == "practice":
                present_practice_counts[user_id] = count
            else:
                present_exam_counts[user_id] = count
        perfect_counts_result = await db.execute(
            select(
                PresentPerfectAttempt.user_id,
                PresentPerfectAttempt.mode,
                func.count(),
            )
            .where(
                PresentPerfectAttempt.user_id.in_(student_ids),
                PresentPerfectAttempt.status == AttemptStatus.SUBMITTED,
            )
            .group_by(PresentPerfectAttempt.user_id, PresentPerfectAttempt.mode)
        )
        for user_id, mode, count in perfect_counts_result.all():
            if mode == "practice":
                present_perfect_practice_counts[user_id] = count
            else:
                present_perfect_exam_counts[user_id] = count
        listening_counts_result = await db.execute(
            select(
                ListeningAttempt.user_id,
                ListeningAttempt.mode,
                func.count(),
            )
            .where(
                ListeningAttempt.user_id.in_(student_ids),
                ListeningAttempt.status == AttemptStatus.SUBMITTED,
            )
            .group_by(ListeningAttempt.user_id, ListeningAttempt.mode)
        )
        for user_id, mode, count in listening_counts_result.all():
            if mode == "practice":
                listening_practice_counts[user_id] = count
            else:
                listening_exam_counts[user_id] = count

    def _submitted_for_exam(user_id, exam_type: str, verb_used: int) -> int:
        if exam_type == ExamType.VERB_EXAM.value:
            return verb_used
        if exam_type == ExamType.VERB_BASE_EXAM.value:
            return verb_base_exam_counts.get(user_id, 0)
        if exam_type == ExamType.PRESENT_SIMPLE_EXAM.value:
            return present_exam_counts.get(user_id, 0)
        if exam_type == ExamType.PRESENT_PERFECT_EXAM.value:
            return present_perfect_exam_counts.get(user_id, 0)
        if exam_type == ExamType.PAST_SIMPLE_EXAM.value:
            return past_exam_counts.get(user_id, 0)
        if exam_type == ExamType.LISTENING_PRACTICE.value:
            return listening_exam_counts.get(user_id, 0)
        return 0

    items: list[AdminUserResponse] = []
    for user in users:
        base = AdminUserResponse.model_validate(user)
        if user.role == UserRole.STUDENT and user.id in attempt_stats:
            verb_used = attempt_stats[user.id]["attempts_used"]
            base = base.model_copy(
                update={
                    **attempt_stats[user.id],
                    "exam_access": [
                        {
                            "exam_type": access.exam_type,
                            "is_enabled": access.is_enabled,
                            "practice_enabled": access.practice_enabled,
                            "allowed_attempts": access.allowed_attempts,
                            "submitted_attempts": _submitted_for_exam(
                                user.id, access.exam_type, verb_used
                            ),
                            "remaining_attempts": max(
                                0,
                                access.allowed_attempts
                                - _submitted_for_exam(
                                    user.id, access.exam_type, verb_used
                                ),
                            ),
                            "practice_submitted_attempts": (
                                past_practice_counts.get(user.id, 0)
                                if access.exam_type
                                == ExamType.PAST_SIMPLE_EXAM.value
                                else present_practice_counts.get(user.id, 0)
                                if access.exam_type
                                == ExamType.PRESENT_SIMPLE_EXAM.value
                                else present_perfect_practice_counts.get(user.id, 0)
                                if access.exam_type
                                == ExamType.PRESENT_PERFECT_EXAM.value
                                else listening_practice_counts.get(user.id, 0)
                                if access.exam_type
                                == ExamType.LISTENING_PRACTICE.value
                                else verb_base_practice_counts.get(user.id, 0)
                                if access.exam_type
                                == ExamType.VERB_BASE_EXAM.value
                                else 0
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
        actor_role=admin.role,
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
    practice_result = await db.execute(
        select(PastSimpleAttempt)
        .where(
            PastSimpleAttempt.user_id == user_id,
            PastSimpleAttempt.mode == "practice",
        )
        .order_by(PastSimpleAttempt.started_at.desc())
    )
    practice_attempts = practice_result.scalars().all()

    verb_base_result = await db.execute(
        select(VerbBaseAttempt)
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == "exam",
        )
        .order_by(VerbBaseAttempt.started_at.desc())
    )
    verb_base_attempts = verb_base_result.scalars().all()
    verb_base_practice_result = await db.execute(
        select(VerbBaseAttempt)
        .where(
            VerbBaseAttempt.user_id == user_id,
            VerbBaseAttempt.mode == "practice",
        )
        .order_by(VerbBaseAttempt.started_at.desc())
    )
    verb_base_practice_attempts = verb_base_practice_result.scalars().all()

    present_result = await db.execute(
        select(PresentSimpleAttempt)
        .where(
            PresentSimpleAttempt.user_id == user_id,
            PresentSimpleAttempt.mode == "exam",
        )
        .order_by(PresentSimpleAttempt.started_at.desc())
    )
    present_attempts = present_result.scalars().all()
    present_practice_result = await db.execute(
        select(PresentSimpleAttempt)
        .where(
            PresentSimpleAttempt.user_id == user_id,
            PresentSimpleAttempt.mode == "practice",
        )
        .order_by(PresentSimpleAttempt.started_at.desc())
    )
    present_practice_attempts = present_practice_result.scalars().all()

    present_perfect_result = await db.execute(
        select(PresentPerfectAttempt)
        .where(
            PresentPerfectAttempt.user_id == user_id,
            PresentPerfectAttempt.mode == "exam",
        )
        .order_by(PresentPerfectAttempt.started_at.desc())
    )
    present_perfect_attempts = present_perfect_result.scalars().all()
    present_perfect_practice_result = await db.execute(
        select(PresentPerfectAttempt)
        .where(
            PresentPerfectAttempt.user_id == user_id,
            PresentPerfectAttempt.mode == "practice",
        )
        .order_by(PresentPerfectAttempt.started_at.desc())
    )
    present_perfect_practice_attempts = present_perfect_practice_result.scalars().all()

    listening_practice_result = await db.execute(
        select(ListeningAttempt)
        .where(
            ListeningAttempt.user_id == user_id,
            ListeningAttempt.mode == "practice",
        )
        .order_by(ListeningAttempt.started_at.desc())
    )
    listening_practice_attempts = listening_practice_result.scalars().all()
    listening_exam_result = await db.execute(
        select(ListeningAttempt)
        .where(
            ListeningAttempt.user_id == user_id,
            ListeningAttempt.mode == "exam",
        )
        .order_by(ListeningAttempt.started_at.desc())
    )
    listening_exam_attempts = listening_exam_result.scalars().all()

    stats = await exam_service.get_student_attempt_stats(db, [user_id])
    attempt_summary = stats.get(user_id, {})

    def _serialize_past_simple(
        attempt: PastSimpleAttempt
        | PresentSimpleAttempt
        | PresentPerfectAttempt
        | ListeningAttempt,
        *,
        exam_name: str,
        exam_type: str,
    ) -> dict:
        return {
            "id": str(attempt.id),
            "exam_type": exam_type,
            "exam_name": exam_name,
            "mode": attempt.mode,
            "attempt_number": attempt.attempt_number,
            "status": attempt.status.value,
            "started_at": attempt.started_at.isoformat(),
            "submitted_at": (
                attempt.submitted_at.isoformat() if attempt.submitted_at else None
            ),
            "percentage": (
                float(attempt.percentage) if attempt.percentage is not None else None
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

    def _serialize_verb_base(attempt: VerbBaseAttempt, *, exam_name: str) -> dict:
        return {
            "id": str(attempt.id),
            "exam_type": ExamType.VERB_BASE_EXAM.value,
            "mode": attempt.mode,
            "exam_name": exam_name,
            "status": attempt.status.value,
            "started_at": attempt.started_at.isoformat(),
            "submitted_at": (
                attempt.submitted_at.isoformat() if attempt.submitted_at else None
            ),
            "percentage": (
                float(attempt.percentage) if attempt.percentage is not None else None
            ),
            "passed": attempt.passed,
            "correct_fields": attempt.correct_answers,
            "total_fields": attempt.total_questions,
            "fully_correct_questions": attempt.correct_answers,
        }

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
        "verb_base_attempts": [
            _serialize_verb_base(attempt, exam_name="Verb Base Form")
            for attempt in verb_base_attempts
        ],
        "verb_base_practice_attempts": [
            _serialize_verb_base(attempt, exam_name="Verb Base Form Practice")
            for attempt in verb_base_practice_attempts
        ],
        "past_simple_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Past Simple Exam",
                exam_type=ExamType.PAST_SIMPLE_EXAM.value,
            )
            for attempt in past_attempts
        ],
        "present_simple_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Present Simple Exam",
                exam_type=ExamType.PRESENT_SIMPLE_EXAM.value,
            )
            for attempt in present_attempts
        ],
        "present_simple_practice_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Present Simple Practice",
                exam_type=ExamType.PRESENT_SIMPLE_EXAM.value,
            )
            for attempt in present_practice_attempts
        ],
        "present_perfect_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Present Perfect Exam",
                exam_type=ExamType.PRESENT_PERFECT_EXAM.value,
            )
            for attempt in present_perfect_attempts
        ],
        "present_perfect_practice_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Present Perfect Practice",
                exam_type=ExamType.PRESENT_PERFECT_EXAM.value,
            )
            for attempt in present_perfect_practice_attempts
        ],
        "listening_practice_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Listening Practice",
                exam_type=ExamType.LISTENING_PRACTICE.value,
            )
            for attempt in listening_practice_attempts
        ],
        "listening_exam_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Listening Exam",
                exam_type=ExamType.LISTENING_PRACTICE.value,
            )
            for attempt in listening_exam_attempts
        ],
        "past_simple_practice_attempts": [
            _serialize_past_simple(
                attempt,
                exam_name="Past Simple Practice",
                exam_type=ExamType.PAST_SIMPLE_EXAM.value,
            )
            for attempt in practice_attempts
        ],
        "practice_sessions_completed": sum(
            1
            for attempt in practice_attempts
            if attempt.status == AttemptStatus.SUBMITTED
        )
        + sum(
            1
            for attempt in present_practice_attempts
            if attempt.status == AttemptStatus.SUBMITTED
        )
        + sum(
            1
            for attempt in present_perfect_practice_attempts
            if attempt.status == AttemptStatus.SUBMITTED
        )
        + sum(
            1
            for attempt in listening_practice_attempts
            if attempt.status == AttemptStatus.SUBMITTED
        )
        + sum(
            1
            for attempt in verb_base_practice_attempts
            if attempt.status == AttemptStatus.SUBMITTED
        ),
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
        actor_role=admin.role,
        user=user,
        username=body.username,
        full_name=body.full_name,
        password=body.password,
        is_active=body.is_active,
    )
    return AdminUserResponse.model_validate(updated)


@router.delete("/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    result = await user_service.delete_user(
        db,
        actor_id=admin.id,
        actor_role=admin.role,
        user=user,
    )
    return {"status": "ok", **result}


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
    created = await user_service.import_users_csv(
        db,
        actor_id=admin.id,
        actor_role=admin.role,
        content=raw,
    )
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
        actor_role=admin.role,
        user=user,
        password=body.password if body else None,
    )
    return ResetPasswordResponse(temporary_password=temp_password)
