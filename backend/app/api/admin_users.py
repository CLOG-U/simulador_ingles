import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import User, UserRole
from app.schemas.user import (
    AdminUserCreate,
    AdminUserCreateResponse,
    AdminUserResponse,
    AdminUserUpdate,
    PaginatedUsersResponse,
    ResetPasswordResponse,
)
from app.services import user_service

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: UserRole | None = None,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users, total = await user_service.list_users(
        db, page=page, page_size=page_size, search=search, role=role
    )
    return PaginatedUsersResponse(
        items=[AdminUserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=AdminUserCreateResponse, status_code=201)
async def create_user(
    body: AdminUserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user, temp_password = await user_service.create_user(
        db,
        actor_id=admin.id,
        username=body.username,
        full_name=body.full_name,
        role=body.role,
    )
    return AdminUserCreateResponse(
        user=AdminUserResponse.model_validate(user),
        temporary_password=temp_password,
    )


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    return AdminUserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    updated = await user_service.update_user(
        db,
        actor_id=admin.id,
        user=user,
        full_name=body.full_name,
        is_active=body.is_active,
    )
    return AdminUserResponse.model_validate(updated)


@router.post("/import")
async def import_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
):
    raw = (await file.read()).decode("utf-8-sig")
    if len(raw) > 512_000:
        from app.core.errors import AppError

        raise AppError("FILE_TOO_LARGE", "El archivo CSV es demasiado grande.", status_code=400)
    created = await user_service.import_users_csv(db, actor_id=admin.id, content=raw)
    return {
        "imported": len(created),
        "users": [
            {
                "username": user.username,
                "full_name": user.full_name,
                "temporary_password": temp,
            }
            for user, temp in created
        ],
    }


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_user(db, user_id)
    temp_password = await user_service.reset_password(db, actor_id=admin.id, user=user)
    return ResetPasswordResponse(temporary_password=temp_password)
