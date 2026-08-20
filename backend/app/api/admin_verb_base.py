import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import ReviewPolicy, User
from app.services import verb_base_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/admin/verb-base", tags=["admin-verb-base"])


class VerbBaseConfigUpdate(BaseModel):
    is_enabled: bool | None = None
    passing_percentage: int | None = Field(default=None, ge=0, le=100)
    duration_minutes: int | None = Field(default=None, ge=1, le=240)
    review_policy: ReviewPolicy | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_non_nullable_nulls(cls, data):
        if isinstance(data, dict):
            for field in ("is_enabled", "passing_percentage", "review_policy"):
                if field in data and data[field] is None:
                    raise ValueError(f"{field} no puede ser null")
        return data


@router.get("/config")
async def get_config(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await verb_base_service.get_visible_config(db)


@router.patch("/config")
async def update_config(
    body: VerbBaseConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await verb_base_service.get_config(db)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(config, key, value)
    config.updated_by = admin.id
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="VERB_BASE_CONFIG_UPDATE",
        target_type="verb_base_config",
        target_id=str(config.id),
        metadata=data,
    )
    await db.commit()
    return await verb_base_service.get_visible_config(db)


@router.get("/attempts")
async def list_attempts(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    items = await verb_base_service.list_attempts_admin(db)
    return {"items": items, "total": len(items)}


@router.get("/attempts/{attempt_id}")
async def attempt_report(
    attempt_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await verb_base_service.serialize_admin_report(db, attempt_id)


class GradeOverrideBody(BaseModel):
    correct: bool


@router.patch("/attempts/{attempt_id}/questions/{question_id}/grade")
async def override_question_grade(
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
    body: GradeOverrideBody,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await verb_base_service.override_question_grade(
        db,
        attempt_id=attempt_id,
        question_id=question_id,
        correct=body.correct,
    )
    await log_audit(
        db,
        actor_user_id=admin.id,
        action="VERB_BASE_GRADE_OVERRIDE",
        target_type="verb_base_attempt_question",
        target_id=str(question_id),
        metadata={"attempt_id": str(attempt_id), "correct": body.correct},
    )
    await db.commit()
    return data
