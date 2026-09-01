import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_student_ready
from app.core.database import get_db
from app.core.errors import AppError
from app.models import AttemptStatus, User
from app.services import verb_past_service

router = APIRouter(prefix="/verb-past", tags=["verb-past-exam"])


class SaveVerbPastAnswerRequest(BaseModel):
    answer: str | None = Field(default=None, max_length=255)


@router.get("/config")
async def config(
    _student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await verb_past_service.get_visible_config(db)


@router.get("/attempts/status")
async def attempt_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await verb_past_service.get_student_attempt_status(db, student.id)


@router.post("/attempts")
async def start_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.create_or_get_attempt(db, student)
    return verb_past_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.get_open_attempt(
        db, student.id, mode=verb_past_service.MODE_EXAM
    )
    if attempt is None:
        return None
    return verb_past_service.serialize_attempt(attempt, include_grades=False)


@router.get("/practice/status")
async def practice_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await verb_past_service.get_attempt_status(
        db,
        student.id,
        mode=verb_past_service.MODE_PRACTICE,
    )


@router.post("/practice/sessions")
async def start_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.create_or_get_practice(db, student)
    return verb_past_service.serialize_attempt(attempt, include_grades=False)


@router.post("/practice/sessions/restart")
async def restart_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    """Cancela la práctica abierta (si existe) y abre una sesión nueva."""
    attempt = await verb_past_service.restart_practice(db, student)
    return verb_past_service.serialize_attempt(attempt, include_grades=False)


@router.post("/practice/sessions/abandon")
async def abandon_practice(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    abandoned = await verb_past_service.abandon_open_practice(db, student.id)
    await db.commit()
    return {"abandoned": abandoned > 0, "abandoned_count": abandoned}


@router.get("/practice/sessions/{attempt_id}")
async def get_practice_session(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    if attempt.mode != verb_past_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    include_grades = attempt.status == AttemptStatus.SUBMITTED
    return verb_past_service.serialize_attempt(
        attempt,
        include_grades=include_grades,
    )


@router.post("/practice/sessions/{attempt_id}/questions/{question_id}/check")
async def check_practice_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveVerbPastAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    if attempt.mode != verb_past_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    return await verb_past_service.check_practice_answer(
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
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    if attempt.mode != verb_past_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    submitted = await verb_past_service.submit_attempt(db, attempt)
    return verb_past_service.serialize_result(
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
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    if attempt.mode != verb_past_service.MODE_PRACTICE:
        raise AppError("NOT_FOUND", "Sesión de práctica no encontrada.", status_code=404)
    if attempt.status != AttemptStatus.SUBMITTED:
        raise AppError(
            "NOT_SUBMITTED",
            "La práctica aún no ha sido entregada.",
            status_code=400,
        )
    return verb_past_service.serialize_result(
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
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    include_grades = attempt.status == AttemptStatus.SUBMITTED
    return verb_past_service.serialize_attempt(attempt, include_grades=include_grades)


@router.patch("/attempts/{attempt_id}/questions/{question_id}")
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveVerbPastAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    await verb_past_service.save_question_answer(
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
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    attempt = await verb_past_service.submit_attempt(db, attempt)
    return verb_past_service.serialize_attempt(attempt, include_grades=True)


@router.get("/attempts/{attempt_id}/result")
async def attempt_result(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await verb_past_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=student.id
    )
    data = verb_past_service.serialize_attempt(
        attempt, include_grades=attempt.status == AttemptStatus.SUBMITTED
    )
    percentage = float(attempt.percentage) if attempt.percentage is not None else None
    data.update(
        {
            "student_id": str(student.id),
            "student_name": student.full_name,
            "student_username": student.username,
            "exam_name": "Verb Past Form",
            "correct_answers": attempt.correct_answers,
            "incorrect_answers": attempt.incorrect_answers,
            "unanswered_answers": attempt.unanswered_answers,
            "total_questions": attempt.total_questions,
            "percentage": percentage,
            "score_out_of_ten": (
                float(round(percentage / 10, 2)) if percentage is not None else None
            ),
            "duration_seconds": (
                int((attempt.submitted_at - attempt.started_at).total_seconds())
                if attempt.submitted_at
                else None
            ),
            "passed": attempt.passed,
            "review_policy": attempt.config_snapshot.get("review_policy", "FULL"),
        }
    )
    return data
