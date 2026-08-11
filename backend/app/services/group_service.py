import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import (
    Attempt,
    AttemptStatus,
    GroupMembership,
    PastSimpleAttempt,
    StudyGroup,
    User,
    UserRole,
)


def _serialize_group(group: StudyGroup, *, include_members: bool = False) -> dict:
    members = None
    if include_members:
        members = [
            {
                "user_id": m.user.id,
                "username": m.user.username,
                "full_name": m.user.full_name,
                "is_active": m.user.is_active,
                "created_at": m.created_at,
            }
            for m in group.memberships
            if m.user is not None
        ]
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "teacher_id": group.teacher_id,
        "teacher_name": group.teacher.full_name if group.teacher else None,
        "is_active": group.is_active,
        "member_count": len(group.memberships),
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "members": members,
    }


async def list_groups(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(StudyGroup)
        .options(
            selectinload(StudyGroup.teacher),
            selectinload(StudyGroup.memberships),
        )
        .order_by(StudyGroup.name.asc())
    )
    return [_serialize_group(g) for g in result.scalars().all()]


async def get_group(session: AsyncSession, group_id: uuid.UUID) -> StudyGroup:
    result = await session.execute(
        select(StudyGroup)
        .options(
            selectinload(StudyGroup.teacher),
            selectinload(StudyGroup.memberships).selectinload(GroupMembership.user),
        )
        .where(StudyGroup.id == group_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise AppError("NOT_FOUND", "Grupo no encontrado.", status_code=404)
    return group


async def create_group(
    session: AsyncSession,
    *,
    name: str,
    description: str | None,
    teacher_id: uuid.UUID | None,
    is_active: bool,
) -> StudyGroup:
    if teacher_id is not None:
        await _ensure_teacher(session, teacher_id)
    group = StudyGroup(
        id=uuid.uuid4(),
        name=name.strip(),
        description=(description or "").strip() or None,
        teacher_id=teacher_id,
        is_active=is_active,
    )
    session.add(group)
    await session.flush()
    return await get_group(session, group.id)


async def update_group(
    session: AsyncSession,
    *,
    group_id: uuid.UUID,
    name: str | None = None,
    description: str | None = None,
    teacher_id: uuid.UUID | None = None,
    clear_teacher: bool = False,
    is_active: bool | None = None,
) -> StudyGroup:
    group = await get_group(session, group_id)
    if name is not None:
        group.name = name.strip()
    if description is not None:
        group.description = description.strip() or None
    if clear_teacher:
        group.teacher_id = None
    elif teacher_id is not None:
        await _ensure_teacher(session, teacher_id)
        group.teacher_id = teacher_id
    if is_active is not None:
        group.is_active = is_active
    group.updated_at = datetime.now(UTC)
    await session.flush()
    return await get_group(session, group.id)


async def delete_group(session: AsyncSession, group_id: uuid.UUID) -> None:
    group = await get_group(session, group_id)
    await session.delete(group)
    await session.flush()


async def add_member(
    session: AsyncSession,
    *,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
) -> StudyGroup:
    group = await get_group(session, group_id)
    user = await session.get(User, user_id)
    if user is None or user.role != UserRole.STUDENT:
        raise AppError("NOT_FOUND", "Estudiante no encontrado.", status_code=404)
    exists = any(m.user_id == user_id for m in group.memberships)
    if exists:
        raise AppError("CONFLICT", "El estudiante ya está en el grupo.", status_code=409)
    session.add(
        GroupMembership(
            id=uuid.uuid4(),
            group_id=group.id,
            user_id=user.id,
        )
    )
    await session.flush()
    return await get_group(session, group.id)


async def remove_member(
    session: AsyncSession,
    *,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
) -> StudyGroup:
    group = await get_group(session, group_id)
    membership = next((m for m in group.memberships if m.user_id == user_id), None)
    if membership is None:
        raise AppError("NOT_FOUND", "El estudiante no pertenece al grupo.", status_code=404)
    await session.delete(membership)
    await session.flush()
    return await get_group(session, group.id)


async def get_group_metrics(session: AsyncSession, group_id: uuid.UUID) -> dict:
    group = await get_group(session, group_id)
    member_ids = [m.user_id for m in group.memberships]
    active_member_count = sum(1 for m in group.memberships if m.user and m.user.is_active)

    if not member_ids:
        return {
            "group_id": group.id,
            "group_name": group.name,
            "member_count": 0,
            "active_member_count": 0,
            "verb_finished": 0,
            "verb_average_percentage": None,
            "past_simple_finished": 0,
            "past_simple_average_percentage": None,
            "alerts": ["El grupo no tiene estudiantes asignados."],
        }

    verb_finished = (
        await session.execute(
            select(func.count())
            .select_from(Attempt)
            .where(
                Attempt.user_id.in_(member_ids),
                Attempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    verb_avg = (
        await session.execute(
            select(func.avg(Attempt.percentage)).where(
                Attempt.user_id.in_(member_ids),
                Attempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    past_finished = (
        await session.execute(
            select(func.count())
            .select_from(PastSimpleAttempt)
            .where(
                PastSimpleAttempt.user_id.in_(member_ids),
                PastSimpleAttempt.mode == "exam",
                PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()
    past_avg = (
        await session.execute(
            select(func.avg(PastSimpleAttempt.percentage)).where(
                PastSimpleAttempt.user_id.in_(member_ids),
                PastSimpleAttempt.mode == "exam",
                PastSimpleAttempt.status == AttemptStatus.SUBMITTED,
            )
        )
    ).scalar_one()

    alerts: list[str] = []
    open_cutoff = datetime.now(UTC) - timedelta(hours=24)
    open_old = (
        await session.execute(
            select(func.count())
            .select_from(Attempt)
            .where(
                Attempt.user_id.in_(member_ids),
                Attempt.status == AttemptStatus.IN_PROGRESS,
                Attempt.started_at < open_cutoff,
            )
        )
    ).scalar_one()
    if open_old:
        alerts.append(
            f"{open_old} intento(s) de Verb Exam abiertos hace más de 24 h."
        )

    students_with_any_attempt = set(
        (
            await session.execute(
                select(Attempt.user_id)
                .where(Attempt.user_id.in_(member_ids))
                .distinct()
            )
        ).scalars().all()
    ) | set(
        (
            await session.execute(
                select(PastSimpleAttempt.user_id)
                .where(PastSimpleAttempt.user_id.in_(member_ids))
                .distinct()
            )
        ).scalars().all()
    )
    inactive_members = [
        m.user.full_name
        for m in group.memberships
        if m.user
        and m.user.is_active
        and m.user_id not in students_with_any_attempt
        and group.created_at < datetime.now(UTC) - timedelta(days=7)
    ]
    if inactive_members:
        sample = ", ".join(inactive_members[:3])
        more = f" (+{len(inactive_members) - 3})" if len(inactive_members) > 3 else ""
        alerts.append(
            f"{len(inactive_members)} estudiante(s) sin intentos tras 7 días: {sample}{more}."
        )

    return {
        "group_id": group.id,
        "group_name": group.name,
        "member_count": len(member_ids),
        "active_member_count": active_member_count,
        "verb_finished": verb_finished,
        "verb_average_percentage": float(verb_avg) if verb_avg is not None else None,
        "past_simple_finished": past_finished,
        "past_simple_average_percentage": float(past_avg) if past_avg is not None else None,
        "alerts": alerts,
    }


async def list_group_summaries_for_dashboard(session: AsyncSession) -> list[dict]:
    groups = await list_groups(session)
    summaries = []
    for item in groups:
        metrics = await get_group_metrics(session, item["id"])
        summaries.append(
            {
                "group_id": metrics["group_id"],
                "group_name": metrics["group_name"],
                "member_count": metrics["member_count"],
                "verb_average_percentage": metrics["verb_average_percentage"],
                "past_simple_average_percentage": metrics[
                    "past_simple_average_percentage"
                ],
                "alert_count": len(metrics["alerts"]),
            }
        )
    return summaries


async def _ensure_teacher(session: AsyncSession, teacher_id: uuid.UUID) -> User:
    user = await session.get(User, teacher_id)
    if user is None or user.role not in {UserRole.ADMIN, UserRole.SUPERADMIN}:
        raise AppError(
            "INVALID_TEACHER",
            "El profesor debe ser un administrador activo.",
            status_code=400,
        )
    if not user.is_active:
        raise AppError("INVALID_TEACHER", "El profesor está inactivo.", status_code=400)
    return user
