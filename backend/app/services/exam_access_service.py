import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import (
    ExamAccess,
    ExamConfig,
    ExamType,
    PastSimpleConfig,
    PresentSimpleConfig,
    VerbBaseConfig,
)


async def _global_exam_enabled(session: AsyncSession, exam_type: ExamType) -> bool:
    model_map = {
        ExamType.VERB_EXAM: ExamConfig,
        ExamType.VERB_BASE_EXAM: VerbBaseConfig,
        ExamType.PAST_SIMPLE_EXAM: PastSimpleConfig,
        ExamType.PRESENT_SIMPLE_EXAM: PresentSimpleConfig,
    }
    model = model_map[exam_type]
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
        practice_enabled=False,
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


async def _global_practice_enabled(session: AsyncSession) -> bool:
    result = await session.execute(select(PastSimpleConfig).limit(1))
    config = result.scalar_one_or_none()
    return bool(config and config.practice_enabled)


async def ensure_practice_available(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> ExamAccess:
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=ExamType.PAST_SIMPLE_EXAM,
    )
    if not await _global_practice_enabled(session) or not access.practice_enabled:
        raise AppError(
            "PRACTICE_NOT_AVAILABLE",
            "La práctica de Past Simple no está habilitada para tu cuenta.",
            status_code=403,
        )
    return access


async def set_student_access(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
    actor_id: uuid.UUID,
    is_enabled: bool | None = None,
    practice_enabled: bool | None = None,
) -> ExamAccess:
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    if is_enabled is not None:
        access.is_enabled = is_enabled
    if practice_enabled is not None:
        if exam_type != ExamType.PAST_SIMPLE_EXAM:
            raise AppError(
                "INVALID_EXAM_TYPE",
                "La práctica solo aplica a Past Simple.",
                status_code=400,
            )
        access.practice_enabled = practice_enabled
    access.updated_by = actor_id
    await session.flush()
    return access


async def authorize_new_attempt(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType,
    actor_id: uuid.UUID,
    mode: str = "exam",
) -> ExamAccess:
    """Suma +1 al cupo de intentos de examen (se acumula con cada autorización).

    La práctica no tiene cupo.
    """
    if mode == "practice":
        raise AppError(
            "INVALID_MODE",
            "La práctica no usa cupo de intentos. Solo se cuenta y se puede resetear.",
            status_code=400,
        )
    if mode != "exam":
        raise AppError(
            "INVALID_MODE",
            "Modo inválido. Usa exam.",
            status_code=400,
        )

    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    # Acumular: cada clic de "Nuevo intento" suma uno al cupo total.
    access.allowed_attempts = int(access.allowed_attempts) + 1
    access.is_enabled = True
    access.updated_by = actor_id
    await session.flush()
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
