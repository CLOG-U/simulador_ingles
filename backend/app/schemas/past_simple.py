from pydantic import BaseModel, Field

from app.models import ReviewPolicy


class SavePastSimpleAnswerRequest(BaseModel):
    answer: str | None = Field(default=None, max_length=1000)


class PastSimpleConfigUpdate(BaseModel):
    is_enabled: bool | None = None
    passing_percentage: int | None = Field(default=None, ge=0, le=100)
    duration_minutes: int | None = Field(default=None, ge=1, le=240)
    review_policy: ReviewPolicy | None = None


class ExamAccessUpdate(BaseModel):
    is_enabled: bool
