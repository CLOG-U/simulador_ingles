import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import ExamAccess, ExamConfig, ExamType, PastSimpleConfig


async def _global_exam_enabled(session: AsyncSession, exam_type: ExamType) -> bool:
    model = ExamConfig if exam_type == ExamType.VERB_EXAM else PastSimpleConfig
    result = await session.execute(select(model).limit(1))
    config = result.scalar_one_or_none()
    return bool(config and config.is_enabled)


async def get_or_create_access(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
) -> ExamAccess:
    result = await session.execute(
        select(ExamAccess).where(
            ExamAccess.user_id == user_id,
            ExamAccess.exam_type == exam_type.value,
        )
    )
    access = result.scalar_one_or_none()
    if access is not None:
        return access

    access = ExamAccess(
        id=uuid.uuid4(),
        user_id=user_id,
        exam_type=exam_type.value,
        is_enabled=exam_type == ExamType.VERB_EXAM,
        allowed_attempts=1,
    )
    session.add(access)
    await session.flush()
    return access


async def ensure_exam_available(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
) -> ExamAccess:
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    if not await _global_exam_enabled(session, exam_type) or not access.is_enabled:
        raise AppError(
            "EXAM_NOT_AVAILABLE",
            "Este examen no está habilitado para tu cuenta.",
            status_code=403,
        )
    return access


async def set_student_access(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
    is_enabled: bool,
    actor_id: uuid.UUID,
) -> ExamAccess:
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    access.is_enabled = is_enabled
    access.updated_by = actor_id
    await session.flush()
    return access


async def authorize_new_attempt(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
    actor_id: uuid.UUID,
) -> ExamAccess:
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    result = await session.execute(
        update(ExamAccess)
        .where(ExamAccess.id == access.id)
        .values(
            allowed_attempts=ExamAccess.allowed_attempts + 1,
            is_enabled=True,
            updated_by=actor_id,
        )
        .returning(ExamAccess.allowed_attempts)
    )
    access.allowed_attempts = result.scalar_one()
    access.is_enabled = True
    access.updated_by = actor_id
    return access


async def get_student_access_map(
    session: AsyncSession,
    user_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict[str, ExamAccess]]:
    if not user_ids:
        return {}
    result = await session.execute(
        select(ExamAccess).where(ExamAccess.user_id.in_(user_ids))
    )
    access_map: dict[uuid.UUID, dict[str, ExamAccess]] = {}
    for access in result.scalars():
        access_map.setdefault(access.user_id, {})[access.exam_type] = access
    return access_map


async def global_availability(session: AsyncSession) -> dict[str, bool]:
    return {
        exam_type.value: await _global_exam_enabled(session, exam_type)
        for exam_type in ExamType
    }
