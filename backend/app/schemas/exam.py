import uuid

from pydantic import BaseModel, Field


class SaveAnswerRequest(BaseModel):
    base: str | None = None
    past: str | None = None
    spanish: str | None = None


class AttemptResultResponse(BaseModel):
    id: uuid.UUID
    status: str
    correct_fields: int | None
    total_fields: int
    fully_correct_questions: int | None
    percentage: float | None
    passed: bool | None
    review_policy: str
    questions: list[dict] = Field(default_factory=list)
