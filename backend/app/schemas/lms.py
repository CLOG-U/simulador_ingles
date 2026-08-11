from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    teacher_id: UUID | None = None
    is_active: bool = True


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=128)
    description: str | None = Field(default=None, max_length=2000)
    teacher_id: UUID | None = None
    is_active: bool | None = None


class GroupMemberAdd(BaseModel):
    user_id: UUID


class GroupMemberOut(BaseModel):
    user_id: UUID
    username: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    teacher_id: UUID | None
    teacher_name: str | None = None
    is_active: bool
    member_count: int = 0
    created_at: datetime
    updated_at: datetime
    members: list[GroupMemberOut] | None = None

    model_config = {"from_attributes": True}


class GroupMetricsOut(BaseModel):
    group_id: UUID
    group_name: str
    member_count: int
    active_member_count: int
    verb_finished: int
    verb_average_percentage: float | None
    past_simple_finished: int
    past_simple_average_percentage: float | None
    alerts: list[str]


class ResourceCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    resource_type: str = Field(pattern="^(pdf|link|video)$")
    url: HttpUrl
    is_active: bool = True
    group_ids: list[UUID] = Field(default_factory=list)


class ResourceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    resource_type: str | None = Field(default=None, pattern="^(pdf|link|video)$")
    url: HttpUrl | None = None
    is_active: bool | None = None
    group_ids: list[UUID] | None = None


class ResourceOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    resource_type: str
    url: str
    is_active: bool
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
    group_ids: list[UUID] = Field(default_factory=list)
    group_names: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
