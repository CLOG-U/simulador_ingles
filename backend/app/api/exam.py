import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_student_ready
from app.core.database import get_db
from app.models import User
from app.schemas.exam import SaveAnswerRequest
from app.services import exam_service

router = APIRouter(tags=["exam"])


@router.get("/exam/config")
async def exam_config(db: AsyncSession = Depends(get_db)):
    return await exam_service.get_visible_config(db)


@router.post("/attempts")
async def start_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.create_or_get_attempt(db, student)
    include_grades = attempt.status.value == "SUBMITTED"
    return exam_service.serialize_attempt(attempt, include_grades=include_grades)


@router.get("/attempts/status")
async def attempt_status(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return await exam_service.get_student_attempt_status(db, student.id)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_open_attempt(db, student.id)
    if attempt is None:
        return None
    return exam_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_attempt_for_user(db, attempt_id=attempt_id, user_id=student.id)
    include_grades = attempt.status.value == "SUBMITTED"
    return exam_service.serialize_attempt(attempt, include_grades=include_grades)


@router.patch("/attempts/{attempt_id}/questions/{question_id}")
async def save_answer(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: SaveAnswerRequest,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_attempt_for_user(db, attempt_id=attempt_id, user_id=student.id)
    await exam_service.save_question_answer(
        db,
        attempt=attempt,
        question_id=question_id,
        answers=body.model_dump(),
    )
    return {"status": "saved"}


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_attempt_for_user(db, attempt_id=attempt_id, user_id=student.id)
    submitted = await exam_service.submit_attempt(db, attempt)
    return exam_service.serialize_attempt(submitted, include_grades=False)


@router.get("/attempts/{attempt_id}/result")
async def attempt_result(
    attempt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_attempt_for_user(
        db, attempt_id=attempt_id, user_id=current_user.id
    )
    if attempt.status.value != "SUBMITTED":
        from app.core.errors import AppError

        raise AppError("NOT_SUBMITTED", "La evaluación aún no ha sido entregada.", status_code=400)

    policy = attempt.config_snapshot.get("review_policy", "FULL")
    is_staff = current_user.role.value in {"ADMIN", "SUPERADMIN"}
    include_grades = policy == "FULL" or (policy == "SCORE_ONLY" and is_staff)
    show_questions = policy in ("FULL", "AFTER_CLOSE") or is_staff

    percentage = float(attempt.percentage) if attempt.percentage is not None else None
    correct = attempt.correct_fields
    total = attempt.total_fields
    incorrect = (total - (correct or 0)) if correct is not None else None
    data = {
        "id": str(attempt.id),
        "status": attempt.status.value,
        "exam_type": "verb_exam",
        "exam_name": "Verb Exam",
        "student_id": str(current_user.id),
        "student_name": current_user.full_name,
        "student_username": current_user.username,
        "started_at": attempt.started_at.isoformat(),
        "submitted_at": (
            attempt.submitted_at.isoformat() if attempt.submitted_at else None
        ),
        "duration_seconds": (
            int((attempt.submitted_at - attempt.started_at).total_seconds())
            if attempt.submitted_at
            else None
        ),
        "correct_fields": correct,
        "total_fields": total,
        "fully_correct_questions": attempt.fully_correct_questions,
        "correct_answers": correct,
        "incorrect_answers": incorrect,
        "unanswered_answers": 0 if correct is not None else None,
        "total_questions": total,
        "percentage": percentage,
        "score_out_of_ten": (
            float(round(percentage / 10, 2)) if percentage is not None else None
        ),
        "passed": attempt.passed,
        "review_policy": policy,
    }
    if show_questions and include_grades:
        data["questions"] = exam_service.serialize_attempt(
            attempt, include_grades=True
        )["questions"]
    elif show_questions:
        data["questions"] = exam_service.serialize_attempt(
            attempt, include_grades=False
        )["questions"]
    return data
