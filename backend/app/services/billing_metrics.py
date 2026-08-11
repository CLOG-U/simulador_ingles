"""Monthly active students (billing) helpers."""

from datetime import UTC, date, datetime

from sqlalchemy import func, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attempt, PastSimpleAttempt, User, UserRole

def _month_start(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=UTC)


def _next_month(dt: datetime) -> datetime:
    if dt.month == 12:
        return datetime(dt.year + 1, 1, 1, tzinfo=UTC)
    return datetime(dt.year, dt.month + 1, 1, tzinfo=UTC)


async def monthly_active_students(
    session: AsyncSession,
    *,
    months: int = 12,
) -> list[dict]:
    """STUDENT with last_login_at in month OR any attempt started that month."""
    today = date.today()
    cursor = date(today.year, today.month, 1)
    series: list[dict] = []

    for _ in range(months):
        start = _month_start(cursor.year, cursor.month)
        end = _next_month(start)

        login_ids = select(User.id).where(
            User.role == UserRole.STUDENT,
            User.last_login_at.is_not(None),
            User.last_login_at >= start,
            User.last_login_at < end,
        )
        verb_ids = select(Attempt.user_id).where(
            Attempt.started_at >= start,
            Attempt.started_at < end,
        )
        past_ids = select(PastSimpleAttempt.user_id).where(
            PastSimpleAttempt.started_at >= start,
            PastSimpleAttempt.started_at < end,
        )
        # Restrict attempt users to STUDENT role.
        verb_students = (
            select(User.id)
            .where(User.role == UserRole.STUDENT, User.id.in_(verb_ids))
        )
        past_students = (
            select(User.id)
            .where(User.role == UserRole.STUDENT, User.id.in_(past_ids))
        )
        combined = union(login_ids, verb_students, past_students).subquery()
        count = (
            await session.execute(select(func.count()).select_from(combined))
        ).scalar_one()

        series.append(
            {
                "year_month": f"{cursor.year:04d}-{cursor.month:02d}",
                "count": count,
            }
        )
        # Go back one month.
        if cursor.month == 1:
            cursor = date(cursor.year - 1, 12, 1)
        else:
            cursor = date(cursor.year, cursor.month - 1, 1)

    series.reverse()
    return series
