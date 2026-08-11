import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import User
from app.schemas.lms import (
    GroupCreate,
    GroupMemberAdd,
    GroupMetricsOut,
    GroupOut,
    GroupUpdate,
)
from app.services import group_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin/groups", tags=["admin-groups"])


class GroupListResponse(BaseModel):
    items: list[GroupOut]


@router.get("", response_model=GroupListResponse)
async def list_groups(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    items = await group_service.list_groups(db)
    return {"items": items}


@router.post("", response_model=GroupOut)
async def create_group(
    payload: GroupCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.create_group(
        db,
        name=payload.name,
        description=payload.description,
        teacher_id=payload.teacher_id,
        is_active=payload.is_active,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="GROUP_CREATE",
        target_type="group",
        target_id=str(group.id),
        metadata={"name": group.name},
    )
    await db.commit()
    return group_service._serialize_group(group, include_members=True)


@router.get("/{group_id}", response_model=GroupOut)
async def get_group(
    group_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.get_group(db, group_id)
    return group_service._serialize_group(group, include_members=True)


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: uuid.UUID,
    payload: GroupUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    clear_teacher = "teacher_id" in data and data.get("teacher_id") is None
    group = await group_service.update_group(
        db,
        group_id=group_id,
        name=data.get("name"),
        description=data.get("description"),
        teacher_id=data.get("teacher_id"),
        clear_teacher=clear_teacher,
        is_active=data.get("is_active"),
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="GROUP_UPDATE",
        target_type="group",
        target_id=str(group.id),
    )
    await db.commit()
    return group_service._serialize_group(group, include_members=True)


@router.delete("/{group_id}")
async def delete_group(
    group_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await group_service.delete_group(db, group_id)
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="GROUP_DELETE",
        target_type="group",
        target_id=str(group_id),
    )
    await db.commit()
    return {"status": "ok"}


@router.post("/{group_id}/members", response_model=GroupOut)
async def add_member(
    group_id: uuid.UUID,
    payload: GroupMemberAdd,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.add_member(
        db, group_id=group_id, user_id=payload.user_id
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="GROUP_ADD_MEMBER",
        target_type="group",
        target_id=str(group_id),
        metadata={"user_id": str(payload.user_id)},
    )
    await db.commit()
    return group_service._serialize_group(group, include_members=True)


@router.delete("/{group_id}/members/{user_id}", response_model=GroupOut)
async def remove_member(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    group = await group_service.remove_member(db, group_id=group_id, user_id=user_id)
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="GROUP_REMOVE_MEMBER",
        target_type="group",
        target_id=str(group_id),
        metadata={"user_id": str(user_id)},
    )
    await db.commit()
    return group_service._serialize_group(group, include_members=True)


@router.get("/{group_id}/metrics", response_model=GroupMetricsOut)
async def group_metrics(
    group_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await group_service.get_group_metrics(db, group_id)
