from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserRole

ONLINE_THRESHOLD = timedelta(minutes=3)
TOUCH_INTERVAL = timedelta(seconds=60)
THRESHOLD_MINUTES = 3


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def is_online(last_seen_at: datetime | None, *, now: datetime | None = None) -> bool:
    if last_seen_at is None:
        return False
    current = now or datetime.now(UTC)
    return _aware(last_seen_at) >= _aware(current) - ONLINE_THRESHOLD


async def touch_last_seen(
    session: AsyncSession,
    user: User,
    *,
    now: datetime | None = None,
    force: bool = False,
) -> bool:
    current = now or datetime.now(UTC)
    if (
        not force
        and user.last_seen_at is not None
        and _aware(current) - _aware(user.last_seen_at) < TOUCH_INTERVAL
    ):
        return False
    user.last_seen_at = current
    await session.commit()
    return True


async def clear_last_seen(session: AsyncSession, user_id) -> None:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return
    user.last_seen_at = None
    await session.commit()


async def list_online_users(
    session: AsyncSession,
    *,
    role: UserRole | None = None,
    now: datetime | None = None,
) -> list[User]:
    current = now or datetime.now(UTC)
    cutoff = _aware(current) - ONLINE_THRESHOLD
    query = select(User).where(
        User.is_active.is_(True),
        User.last_seen_at.is_not(None),
        User.last_seen_at >= cutoff,
    )
    if role is not None:
        query = query.where(User.role == role)
    query = query.order_by(User.last_seen_at.desc(), User.full_name.asc())
    result = await session.execute(query)
    return list(result.scalars().all())
