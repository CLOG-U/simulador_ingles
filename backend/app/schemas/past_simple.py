from pydantic import BaseModel, Field, model_validator

from app.models import ReviewPolicy


class SavePastSimpleAnswerRequest(BaseModel):
    answer: str | None = Field(default=None, max_length=1000)


class PastSimpleConfigUpdate(BaseModel):
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


class ExamAccessUpdate(BaseModel):
    is_enabled: bool
