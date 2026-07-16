import uuid
from datetime import datetime

from pydantic import BaseModel

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import AuditLog, User

router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit"])


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    action: str
    target_type: str | None
    target_id: str | None
    metadata: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int


@router.get("", response_model=PaginatedAuditResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    page_size = min(page_size, 200)
    offset = (page - 1) * page_size
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    )
    logs = result.scalars().all()
    return PaginatedAuditResponse(
        items=[
            AuditLogResponse(
                id=log.id,
                actor_user_id=log.actor_user_id,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                metadata=log.metadata_,
                created_at=log.created_at,
            )
            for log in logs
        ],
        total=len(logs),
    )
