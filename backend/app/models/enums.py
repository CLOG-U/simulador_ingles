import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"


class VerbAnswerField(str, enum.Enum):
    BASE = "BASE"
    PAST = "PAST"
    SPANISH = "SPANISH"


class ReviewPolicy(str, enum.Enum):
    FULL = "FULL"
    SCORE_ONLY = "SCORE_ONLY"
    AFTER_CLOSE = "AFTER_CLOSE"


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PromptType(str, enum.Enum):
    FROM_SPANISH = "FROM_SPANISH"
    FROM_BASE = "FROM_BASE"
    FROM_PAST = "FROM_PAST"
