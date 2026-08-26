import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_student_ready
from app.core.database import get_db
from app.core.errors import AppError
from app.models import AttemptStatus, User
from app.schemas.listening import SaveListeningAnswerRequest
from app.services import listening_service

router = APIRouter(prefix="/listening", tags=["listening-exam"])


@router.get("/config")
async def config(
    _student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await listening_service.get_visible_config(db)


@router.get("/attempts/status")
async def attempt_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await listening_service.get_attempt_status(db, student.id)


@router.post("/attempts")
async def start_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.create_or_get_attempt(db, student)
    return listening_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_open_attempt(
        db,
        student.id,
        mode=listening_service.MODE_EXAM,
    )
    if attempt is None:
        return None
    return listening_service.serialize_attempt(attempt, include_grades=False)


@router.get("/practice/clips")
async def list_practice_clips(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await listening_service.list_practice_clips(db, student.id)


@router.get("/practice/status")
async def practice_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await listening_service.get_attempt_status(
        db,
        student.id,
        mode=listening_service.MODE_PRACTICE,
    )


@router.post("/practice/sessions")
async def start_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
    clip_key: str = Query(..., min_length=1, max_length=64),
):
    attempt = await listening_service.create_or_get_practice(
        db, student, clip_key=clip_key
    )
    return listening_service.serialize_attempt(attempt, include_grades=False)


@router.post("/practice/sessions/restart")
async def restart_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
    clip_key: str = Query(..., min_length=1, max_length=64),
):
    """Cancela la práctica abierta de este clip (si existe) y abre una sesión nueva."""
    attempt = await listening_service.restart_practice(db, student, clip_key=clip_key)
    return listening_service.serialize_attempt(attempt, include_grades=False)


@router.post("/practice/sessions/abandon")
async def abandon_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
    clip_key: str | None = Query(default=None, max_length=64),
):
    abandoned = await listening_service.abandon_open_practice(
        db, student.id, clip_key=clip_key
    )
    await db.commit()
    return {"abandoned": abandoned > 0, "abandoned_count": abandoned}


@router.get("/practice/sessions/{attempt_id}")
async def get_practice_session(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    if attempt.mode != listening_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    include_grades = attempt.status == AttemptStatus.SUBMITTED
    return listening_service.serialize_attempt(
        attempt,
        include_grades=include_grades,
    )


@router.post("/practice/sessions/{attempt_id}/questions/{question_id}/check")
async def check_practice_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveListeningAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    if attempt.mode != listening_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    return await listening_service.check_practice_answer(
        db,
        attempt=attempt,
        question_id=question_id,
        answer=body.answer,
    )


@router.post("/practice/sessions/{attempt_id}/submit")
async def submit_practice(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    if attempt.mode != listening_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    submitted = await listening_service.submit_attempt(db, attempt)
    return listening_service.serialize_result(
        submitted,
        student=student,
        include_review=True,
    )


@router.get("/practice/sessions/{attempt_id}/result")
async def practice_result(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    if attempt.mode != listening_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    if attempt.status != AttemptStatus.SUBMITTED:
        raise AppError(
            "NOT_SUBMITTED",
            "La práctica aún no ha sido entregada.",
            status_code=400,
        )
    return listening_service.serialize_result(
        attempt,
        student=student,
        include_review=True,
    )


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    review_policy = attempt.config_snapshot.get("review_policy", "FULL")
    return listening_service.serialize_attempt(
        attempt,
        include_grades=(
            attempt.status == AttemptStatus.SUBMITTED
            and review_policy == "FULL"
        ),
    )


@router.patch("/attempts/{attempt_id}/questions/{question_id}")
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveListeningAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    await listening_service.save_answer(
        db,
        attempt=attempt,
        question_id=question_id,
        answer=body.answer,
    )
    return {"status": "saved"}


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    submitted = await listening_service.submit_attempt(db, attempt)
    return listening_service.serialize_attempt(submitted, include_grades=False)


@router.get("/attempts/{attempt_id}/result")
async def result(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await listening_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    if attempt.status != AttemptStatus.SUBMITTED:
        raise AppError(
            "NOT_SUBMITTED",
            "La evaluación aún no ha sido entregada.",
            status_code=400,
        )
    policy = attempt.config_snapshot.get("review_policy", "FULL")
    return listening_service.serialize_result(
        attempt,
        student=student,
        include_review=policy == "FULL",
    )
