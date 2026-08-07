import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import Attempt, AttemptStatus, ExamType, PastSimpleAttempt, User

router = APIRouter(prefix="/admin/attempts", tags=["admin-export"])


@router.get("/export.csv")
async def export_attempts_csv(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt, User)
        .join(User, User.id == Attempt.user_id)
        .where(Attempt.status == AttemptStatus.SUBMITTED)
        .order_by(Attempt.submitted_at.desc())
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "exam_type",
            "attempt_id",
            "attempt_number",
            "username",
            "full_name",
            "percentage",
            "score_out_of_ten",
            "correct",
            "incorrect",
            "unanswered",
            "passed",
            "submitted_at",
        ]
    )
    for attempt, user in result.all():
        writer.writerow(
            [
                ExamType.VERB_EXAM.value,
                str(attempt.id),
                "",
                user.username,
                user.full_name,
                float(attempt.percentage) if attempt.percentage is not None else "",
                "",
                attempt.correct_fields,
                "",
                "",
                attempt.passed,
                attempt.submitted_at.isoformat() if attempt.submitted_at else "",
            ]
        )
    past_result = await db.execute(
        select(PastSimpleAttempt, User)
        .join(User, User.id == PastSimpleAttempt.user_id)
        .where(PastSimpleAttempt.status == AttemptStatus.SUBMITTED)
        .order_by(PastSimpleAttempt.submitted_at.desc())
    )
    for attempt, user in past_result.all():
        writer.writerow(
            [
                ExamType.PAST_SIMPLE_EXAM.value,
                str(attempt.id),
                attempt.attempt_number,
                user.username,
                user.full_name,
                float(attempt.percentage) if attempt.percentage is not None else "",
                (
                    float(attempt.score_out_of_ten)
                    if attempt.score_out_of_ten is not None
                    else ""
                ),
                attempt.correct_answers,
                attempt.incorrect_answers,
                attempt.unanswered_answers,
                attempt.passed,
                attempt.submitted_at.isoformat() if attempt.submitted_at else "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=resultados.csv"},
    )
