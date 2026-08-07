import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_student_ready
from app.core.database import get_db
from app.core.errors import AppError
from app.models import AttemptStatus, User
from app.schemas.past_simple import SavePastSimpleAnswerRequest
from app.services import past_simple_service

router = APIRouter(prefix="/past-simple", tags=["past-simple-exam"])


@router.get("/config")
async def config(
    _student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await past_simple_service.get_visible_config(db)


@router.get("/attempts/status")
async def attempt_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await past_simple_service.get_attempt_status(db, student.id)


@router.post("/attempts")
async def start_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await past_simple_service.create_or_get_attempt(db, student)
    return past_simple_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await past_simple_service.get_open_attempt(db, student.id)
    if attempt is None:
        return None
    return past_simple_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await past_simple_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    return past_simple_service.serialize_attempt(
        attempt,
        include_grades=attempt.status == AttemptStatus.SUBMITTED,
    )


@router.patch("/attempts/{attempt_id}/questions/{question_id}")
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SavePastSimpleAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await past_simple_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    await past_simple_service.save_answer(
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
    attempt = await past_simple_service.get_attempt_for_user(
        db,
        attempt_id=attempt_id,
        user_id=student.id,
    )
    submitted = await past_simple_service.submit_attempt(db, attempt)
    return past_simple_service.serialize_attempt(submitted, include_grades=False)


@router.get("/attempts/{attempt_id}/result")
async def result(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await past_simple_service.get_attempt_for_user(
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
    return past_simple_service.serialize_result(
        attempt,
        student=student,
        include_review=policy == "FULL",
    )
