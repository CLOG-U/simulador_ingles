import uuid
from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.models.enums import UserRole
from app.services.presence_service import THRESHOLD_MINUTES
from app.services.presence_service import is_online as user_is_online


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.STUDENT
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminUserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=64)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool | None = None


class AdminResetPasswordRequest(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None
    last_seen_at: datetime | None = None
    attempts_used: int | None = None
    attempts_max: int | None = None
    attempts_remaining: int | None = None
    has_open_attempt: bool | None = None
    exam_access: list[dict] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def is_online(self) -> bool:
        return user_is_online(self.last_seen_at)


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


class OnlineUserResponse(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    last_seen_at: datetime

    model_config = {"from_attributes": True}


class OnlineUsersResponse(BaseModel):
    count: int
    student_count: int
    threshold_minutes: int = THRESHOLD_MINUTES
    items: list[OnlineUserResponse]
