from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"


class VerbAnswerField(StrEnum):
    BASE = "BASE"
    PAST = "PAST"
    SPANISH = "SPANISH"


class ReviewPolicy(StrEnum):
    FULL = "FULL"
    SCORE_ONLY = "SCORE_ONLY"
    AFTER_CLOSE = "AFTER_CLOSE"


class AttemptStatus(StrEnum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PromptType(StrEnum):
    FROM_SPANISH = "FROM_SPANISH"
    FROM_BASE = "FROM_BASE"
    FROM_PAST = "FROM_PAST"
