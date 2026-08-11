import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin, require_student_ready
from app.core.database import get_db
from app.models import User
from app.schemas.lms import ResourceCreate, ResourceOut, ResourceUpdate
from app.services import resource_service
from app.services.audit_service import log_audit

admin_router = APIRouter(prefix="/admin/resources", tags=["admin-resources"])
student_router = APIRouter(prefix="/student/resources", tags=["student-resources"])


class ResourceListResponse(BaseModel):
    items: list[ResourceOut]


@admin_router.get("", response_model=ResourceListResponse)
async def list_resources(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return {"items": await resource_service.list_resources(db)}


@admin_router.post("", response_model=ResourceOut)
async def create_resource(
    payload: ResourceCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    resource = await resource_service.create_resource(
        db,
        title=payload.title,
        description=payload.description,
        resource_type=payload.resource_type,
        url=str(payload.url),
        is_active=payload.is_active,
        created_by=admin.id,
        group_ids=payload.group_ids,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="RESOURCE_CREATE",
        target_type="resource",
        target_id=str(resource.id),
        metadata={"title": resource.title},
    )
    await db.commit()
    return resource_service._serialize_resource(resource)


@admin_router.get("/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    resource = await resource_service.get_resource(db, resource_id)
    return resource_service._serialize_resource(resource)


@admin_router.patch("/{resource_id}", response_model=ResourceOut)
async def update_resource(
    resource_id: uuid.UUID,
    payload: ResourceUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "url" in data and data["url"] is not None:
        data["url"] = str(data["url"])
    resource = await resource_service.update_resource(
        db,
        resource_id=resource_id,
        title=data.get("title"),
        description=data.get("description"),
        resource_type=data.get("resource_type"),
        url=data.get("url"),
        is_active=data.get("is_active"),
        group_ids=data.get("group_ids"),
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="RESOURCE_UPDATE",
        target_type="resource",
        target_id=str(resource.id),
    )
    await db.commit()
    return resource_service._serialize_resource(resource)


@admin_router.delete("/{resource_id}")
async def delete_resource(
    resource_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await resource_service.delete_resource(db, resource_id)
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="RESOURCE_DELETE",
        target_type="resource",
        target_id=str(resource_id),
    )
    await db.commit()
    return {"status": "ok"}


@student_router.get("", response_model=ResourceListResponse)
async def student_list_resources(
    student: User = Depends(require_student_ready),
    db: AsyncSession = Depends(get_db),
):
    return {
        "items": await resource_service.list_student_resources(
            db, student_id=student.id
        )
    }
