import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from app.models.enums import UserRole


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.STUDENT


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    is_active: bool | None = None


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class AdminUserCreateResponse(BaseModel):
    user: AdminUserResponse
    temporary_password: str


class ResetPasswordResponse(BaseModel):
    temporary_password: str


class PaginatedUsersResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    page_size: int
