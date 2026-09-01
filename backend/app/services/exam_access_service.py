import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import (
    ExamAccess,
    ExamConfig,
    ExamType,
    ListeningConfig,
    PastSimpleConfig,
    PresentPerfectConfig,
    PresentSimpleConfig,
    VerbBaseConfig,
    VerbPastConfig,
)

_CONFIG_MODEL = {
    ExamType.VERB_EXAM: ExamConfig,
    ExamType.VERB_BASE_EXAM: VerbBaseConfig,
    ExamType.VERB_PAST_EXAM: VerbPastConfig,
    ExamType.PAST_SIMPLE_EXAM: PastSimpleConfig,
    ExamType.PRESENT_SIMPLE_EXAM: PresentSimpleConfig,
    ExamType.PRESENT_PERFECT_EXAM: PresentPerfectConfig,
    ExamType.LISTENING_PRACTICE: ListeningConfig,
}

_PRACTICE_EXAMS = {
    ExamType.VERB_BASE_EXAM,
    ExamType.VERB_PAST_EXAM,
    ExamType.PAST_SIMPLE_EXAM,
    ExamType.PRESENT_SIMPLE_EXAM,
    ExamType.PRESENT_PERFECT_EXAM,
    ExamType.LISTENING_PRACTICE,
}

_EXAM_ACCESS_TYPES = {
    ExamType.VERB_EXAM,
    ExamType.VERB_BASE_EXAM,
    ExamType.PAST_SIMPLE_EXAM,
    ExamType.PRESENT_SIMPLE_EXAM,
    ExamType.PRESENT_PERFECT_EXAM,
    ExamType.LISTENING_PRACTICE,
}


async def _global_exam_enabled(session: AsyncSession, exam_type: ExamType) -> bool:
    model = _CONFIG_MODEL[exam_type]
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


async def _global_practice_enabled(session: AsyncSession, exam_type: ExamType) -> bool:
    if exam_type not in _PRACTICE_EXAMS:
        return False
    model = _CONFIG_MODEL[exam_type]
    result = await session.execute(select(model).limit(1))
    config = result.scalar_one_or_none()
    return bool(config and getattr(config, "practice_enabled", False))


async def ensure_practice_available(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    exam_type: ExamType = ExamType.PAST_SIMPLE_EXAM,
) -> ExamAccess:
    if exam_type not in _PRACTICE_EXAMS:
        raise AppError(
            "PRACTICE_NOT_AVAILABLE",
            "Este módulo no tiene modo práctica.",
            status_code=403,
        )
    access = await get_or_create_access(
        session,
        user_id=user_id,
        exam_type=exam_type,
    )
    if not await _global_practice_enabled(session, exam_type) or not access.practice_enabled:
        raise AppError(
            "PRACTICE_NOT_AVAILABLE",
            "La práctica no está habilitada para tu cuenta.",
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
        if exam_type not in _PRACTICE_EXAMS:
            raise AppError(
                "INVALID_EXAM_TYPE",
                "La práctica solo aplica a Verb Base Form, Verb Past Form, "
                "Past Simple, Present Simple, Present Perfect y Listening.",
                status_code=400,
            )
        access.practice_enabled = practice_enabled
    access.updated_by = actor_id
    await session.flush()
    return access


async def set_student_access_bulk(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    actor_id: uuid.UUID,
    exams: bool | None = None,
    practices: bool | None = None,
) -> dict:
    if exams is None and practices is None:
        raise AppError(
            "INVALID_ACCESS_UPDATE",
            "Debes indicar si cambian los exámenes, las prácticas o ambos.",
            status_code=400,
        )

    updated: list[dict] = []
    for exam_type in ExamType:
        is_enabled = exams if exam_type in _EXAM_ACCESS_TYPES else None
        practice_enabled = practices if exam_type in _PRACTICE_EXAMS else None
        if is_enabled is None and practice_enabled is None:
            continue
        access = await set_student_access(
            session,
            user_id=user_id,
            exam_type=exam_type,
            actor_id=actor_id,
            is_enabled=is_enabled,
            practice_enabled=practice_enabled,
        )
        updated.append(
            {
                "exam_type": access.exam_type,
                "is_enabled": access.is_enabled,
                "practice_enabled": access.practice_enabled,
            }
        )
    return {
        "exams": exams,
        "practices": practices,
        "updated": updated,
    }


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
