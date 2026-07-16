import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_student
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
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.create_or_get_attempt(db, student)
    include_grades = attempt.status.value == "SUBMITTED"
    return exam_service.serialize_attempt(attempt, include_grades=include_grades)


@router.get("/attempts/current")
async def current_attempt(
    student: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    attempt = await exam_service.get_open_attempt(db, student.id)
    if attempt is None:
        return None
    return exam_service.serialize_attempt(attempt, include_grades=False)


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: uuid.UUID,
    student: User = Depends(require_student),
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
    student: User = Depends(require_student),
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
    student: User = Depends(require_student),
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
    include_grades = policy == "FULL" or (
        policy == "SCORE_ONLY" and current_user.role.value == "ADMIN"
    )
    show_questions = policy in ("FULL", "AFTER_CLOSE") or current_user.role.value == "ADMIN"

    data = {
        "id": str(attempt.id),
        "status": attempt.status.value,
        "correct_fields": attempt.correct_fields,
        "total_fields": attempt.total_fields,
        "fully_correct_questions": attempt.fully_correct_questions,
        "percentage": float(attempt.percentage) if attempt.percentage is not None else None,
        "passed": attempt.passed,
        "review_policy": policy,
    }
    if show_questions and include_grades:
        data["questions"] = exam_service.serialize_attempt(attempt, include_grades=True)["questions"]
    elif show_questions:
        data["questions"] = exam_service.serialize_attempt(attempt, include_grades=False)["questions"]
    return data
