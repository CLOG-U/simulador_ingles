from enum import StrEnum


class UserRole(StrEnum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"


class ExamType(StrEnum):
    VERB_EXAM = "verb_exam"
    VERB_BASE_EXAM = "verb_base_exam"
    VERB_PAST_EXAM = "verb_past_exam"
    PAST_SIMPLE_EXAM = "past_simple_exam"
    PRESENT_SIMPLE_EXAM = "present_simple_exam"
    PRESENT_PERFECT_EXAM = "present_perfect_exam"
    LISTENING_PRACTICE = "listening_practice"


class PastSimpleQuestionType(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    FILL_BLANK = "fill_blank"
    ORDER_WORDS = "order_words"
    TRANSFORM_QUESTION = "transform_question"
    ERROR_CORRECTION = "error_correction"


class PastSimpleTopic(StrEnum):
    INTERROGATIVE_STRUCTURE = "interrogative_structure"
    USE_OF_DID = "use_of_did"
    REGULAR_IRREGULAR_VERBS = "regular_irregular_verbs"
    SHORT_ANSWERS = "short_answers"
    WAS_WERE = "was_were"
    QUESTION_WORDS = "question_words"
    WHAT = "what"
    WHERE = "where"
    WHEN = "when"
    WHY = "why"
    WHO = "who"
    HOW = "how"


class PresentSimpleQuestionType(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    FILL_BLANK = "fill_blank"
    ORDER_WORDS = "order_words"
    IDENTIFY = "identify"
    TRANSFORM_SENTENCE = "transform_sentence"
    SHORT_ANSWER = "short_answer"


class PresentSimpleTopic(StrEnum):
    AFFIRMATIVE = "affirmative"
    NEGATIVE = "negative"
    INTERROGATIVE = "interrogative"
    SHORT_ANSWERS = "short_answers"
    IDENTIFY = "identify"
    ORDER_WORDS = "order_words"
    SENTENCES = "sentences"


class PresentPerfectQuestionType(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    FILL_BLANK = "fill_blank"
    ORDER_WORDS = "order_words"
    IDENTIFY = "identify"
    TRANSFORM_SENTENCE = "transform_sentence"
    SHORT_ANSWER = "short_answer"


class PresentPerfectTopic(StrEnum):
    AFFIRMATIVE = "affirmative"
    NEGATIVE = "negative"
    INTERROGATIVE = "interrogative"
    SHORT_ANSWERS = "short_answers"
    IDENTIFY = "identify"
    ORDER_WORDS = "order_words"
    SENTENCES = "sentences"


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


class BaseFormPromptType(StrEnum):
    """Tipos de pista del Verb Base Form: español ↔ forma base (sin pasado)."""

    FROM_SPANISH = "FROM_SPANISH"
    FROM_BASE = "FROM_BASE"


class PastFormPromptType(StrEnum):
    """Tipos de pista del Verb Past Form: español o forma base → pasado."""

    FROM_SPANISH = "FROM_SPANISH"
    FROM_BASE = "FROM_BASE"
