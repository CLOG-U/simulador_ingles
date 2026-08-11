import uuid
from datetime import UTC, datetime
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import GroupMembership, Resource, ResourceGroup, StudyGroup, UserRole
from app.models.enums import ResourceType


ALLOWED_TYPES = {ResourceType.PDF.value, ResourceType.LINK.value, ResourceType.VIDEO.value}


def _validate_url(url: str) -> str:
    raw = str(url).strip()
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise AppError(
            "INVALID_URL",
            "La URL debe comenzar con http:// o https://.",
            status_code=400,
        )
    return raw


def _serialize_resource(resource: Resource) -> dict:
    return {
        "id": resource.id,
        "title": resource.title,
        "description": resource.description,
        "resource_type": resource.resource_type,
        "url": resource.url,
        "is_active": resource.is_active,
        "created_by": resource.created_by,
        "created_at": resource.created_at,
        "updated_at": resource.updated_at,
        "group_ids": [link.group_id for link in resource.group_links],
        "group_names": [
            link.group.name for link in resource.group_links if link.group is not None
        ],
    }


async def list_resources(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(Resource)
        .options(selectinload(Resource.group_links).selectinload(ResourceGroup.group))
        .order_by(Resource.created_at.desc())
    )
    return [_serialize_resource(r) for r in result.scalars().all()]


async def get_resource(session: AsyncSession, resource_id: uuid.UUID) -> Resource:
    result = await session.execute(
        select(Resource)
        .options(selectinload(Resource.group_links).selectinload(ResourceGroup.group))
        .where(Resource.id == resource_id)
    )
    resource = result.scalar_one_or_none()
    if resource is None:
        raise AppError("NOT_FOUND", "Recurso no encontrado.", status_code=404)
    return resource


async def create_resource(
    session: AsyncSession,
    *,
    title: str,
    description: str | None,
    resource_type: str,
    url: str,
    is_active: bool,
    created_by: uuid.UUID,
    group_ids: list[uuid.UUID],
) -> Resource:
    if resource_type not in ALLOWED_TYPES:
        raise AppError("INVALID_TYPE", "Tipo de recurso inválido.", status_code=400)
    resource = Resource(
        id=uuid.uuid4(),
        title=title.strip(),
        description=(description or "").strip() or None,
        resource_type=resource_type,
        url=_validate_url(url),
        is_active=is_active,
        created_by=created_by,
    )
    session.add(resource)
    await session.flush()
    await _set_groups(session, resource.id, group_ids)
    return await get_resource(session, resource.id)


async def update_resource(
    session: AsyncSession,
    *,
    resource_id: uuid.UUID,
    title: str | None = None,
    description: str | None = None,
    resource_type: str | None = None,
    url: str | None = None,
    is_active: bool | None = None,
    group_ids: list[uuid.UUID] | None = None,
) -> Resource:
    resource = await get_resource(session, resource_id)
    if title is not None:
        resource.title = title.strip()
    if description is not None:
        resource.description = description.strip() or None
    if resource_type is not None:
        if resource_type not in ALLOWED_TYPES:
            raise AppError("INVALID_TYPE", "Tipo de recurso inválido.", status_code=400)
        resource.resource_type = resource_type
    if url is not None:
        resource.url = _validate_url(url)
    if is_active is not None:
        resource.is_active = is_active
    resource.updated_at = datetime.now(UTC)
    await session.flush()
    if group_ids is not None:
        await _set_groups(session, resource.id, group_ids)
    return await get_resource(session, resource.id)


async def delete_resource(session: AsyncSession, resource_id: uuid.UUID) -> None:
    resource = await get_resource(session, resource_id)
    await session.delete(resource)
    await session.flush()


async def list_student_resources(
    session: AsyncSession,
    *,
    student_id: uuid.UUID,
) -> list[dict]:
    group_ids = (
        await session.execute(
            select(GroupMembership.group_id)
            .join(StudyGroup, StudyGroup.id == GroupMembership.group_id)
            .where(
                GroupMembership.user_id == student_id,
                StudyGroup.is_active.is_(True),
            )
        )
    ).scalars().all()
    if not group_ids:
        return []

    result = await session.execute(
        select(Resource)
        .join(ResourceGroup, ResourceGroup.resource_id == Resource.id)
        .options(selectinload(Resource.group_links).selectinload(ResourceGroup.group))
        .where(
            ResourceGroup.group_id.in_(group_ids),
            Resource.is_active.is_(True),
        )
        .order_by(Resource.title.asc())
    )
    # Deduplicate resources assigned to multiple of the student's groups.
    seen: set[uuid.UUID] = set()
    items: list[dict] = []
    for resource in result.scalars().all():
        if resource.id in seen:
            continue
        seen.add(resource.id)
        items.append(_serialize_resource(resource))
    return items


async def _set_groups(
    session: AsyncSession,
    resource_id: uuid.UUID,
    group_ids: list[uuid.UUID],
) -> None:
    unique_ids = list(dict.fromkeys(group_ids))
    if unique_ids:
        found = (
            await session.execute(select(StudyGroup.id).where(StudyGroup.id.in_(unique_ids)))
        ).scalars().all()
        if len(found) != len(unique_ids):
            raise AppError(
                "NOT_FOUND",
                "Uno o más grupos no existen.",
                status_code=404,
            )

    existing = (
        await session.execute(
            select(ResourceGroup).where(ResourceGroup.resource_id == resource_id)
        )
    ).scalars().all()
    for link in existing:
        await session.delete(link)
    await session.flush()

    for group_id in unique_ids:
        session.add(
            ResourceGroup(
                id=uuid.uuid4(),
                resource_id=resource_id,
                group_id=group_id,
            )
        )
    await session.flush()
