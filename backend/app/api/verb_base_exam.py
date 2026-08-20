import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_student_ready
from app.core.database import get_db
from app.models import AttemptStatus, User
from app.services import verb_base_service

router = APIRouter(prefix="/verb-base", tags=["verb-base-exam"])


class SaveVerbBaseAnswerRequest(BaseModel):
    answer: str | None = Field(default=None, max_length=255)


@router.get("/config")
async def config(
    _student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await verb_base_service.get_visible_config(db)


@router.get("/attempts/status")
async def attempt_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await verb_base_service.get_student_attempt_status(db, student.id)


@router.post("/attempts")
async def start_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_base_service.create_or_get_attempt(db, student)
    return verb_base_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_base_service.get_open_attempt(db, student.id)
    if attempt is None:
        return None
    return verb_base_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_base_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    include_grades = attempt.status == AttemptStatus.SUBMITTED
    return verb_base_service.serialize_attempt(attempt, include_grades=include_grades)


@router.patch("/attempts/{attempt_id}/questions/{question_id}")
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveVerbBaseAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_base_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    await verb_base_service.save_question_answer(
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
    attempt = await verb_base_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    attempt = await verb_base_service.submit_attempt(db, attempt)
    return verb_base_service.serialize_attempt(attempt, include_grades=True)


@router.get("/attempts/{attempt_id}/result")
async def attempt_result(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_base_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    data = verb_base_service.serialize_attempt(
        attempt, include_grades=attempt.status == AttemptStatus.SUBMITTED
    )
    data.update(
        {
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "unanswered_answers": attempt.unanswered_answers,
            "total_questions": attempt.total_questions,
            "percentage": float(attempt.percentage) if attempt.percentage is not None else None,
            "passed": attempt.passed,
            "review_policy": attempt.config_snapshot.get("review_policy", "FULL"),
        }
    )
    return data
