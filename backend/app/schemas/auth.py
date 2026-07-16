from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserMeResponse(BaseModel):
    id: UUID
    username: str
    full_name: str
    role: UserRole
    must_change_password: bool
    is_active: bool
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserMeResponse
    must_change_password: bool
    # También en body: en Render frontend/API son hosts distintos y las
    # cookies cross-site a menudo no llegan (sobre todo en móvil).
    access_token: str
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RefreshResponse(BaseModel):
    user: UserMeResponse
    access_token: str
    refresh_token: str
