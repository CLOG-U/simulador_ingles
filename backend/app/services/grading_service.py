from datetime import UTC, datetime
from decimal import Decimal

from app.models import Attempt, AttemptQuestion
from app.services.exam_engine import fields_for_prompt
from app.services.normalization import normalize_spanish, normalize_text


def _grade_field(raw: str | None, field: str, valid: dict[str, list[str]]) -> bool:
    if raw is None or not raw.strip():
        return False
    normalizer = normalize_spanish if field == "SPANISH" else normalize_text
    normalized = normalizer(raw)
    return normalized in valid.get(field, [])


def grade_question(question: AttemptQuestion) -> tuple[bool, bool]:
    required = fields_for_prompt(question.prompt_type)
    valid = question.snapshot_valid_answers
    results: dict[str, bool] = {}

    for field in ("BASE", "PAST", "SPANISH"):
        if field in required:
            raw = {
                "BASE": question.answer_base_raw,
                "PAST": question.answer_past_raw,
                "SPANISH": question.answer_spanish_raw,
            }[field]
            ok = _grade_field(raw, field, valid)
            results[field] = ok
            if field == "BASE":
                question.is_base_correct = ok
            elif field == "PAST":
                question.is_past_correct = ok
            else:
                question.is_spanish_correct = ok
        else:
            if field == "BASE":
                question.is_base_correct = None
            elif field == "PAST":
                question.is_past_correct = None
            else:
                question.is_spanish_correct = None

    question.graded_at = datetime.now(UTC)
    graded = [results[f] for f in required]
    return all(graded), any(graded)


def grade_attempt(attempt: Attempt) -> None:
    correct_fields = 0
    fully_correct = 0
    for question in attempt.questions:
        all_ok, any_ok = grade_question(question)
        required = fields_for_prompt(question.prompt_type)
        correct_fields += sum(
            1
            for f in required
            if {
                "BASE": question.is_base_correct,
                "PAST": question.is_past_correct,
                "SPANISH": question.is_spanish_correct,
            }[f]
        )
        if all_ok:
            fully_correct += 1

    total_fields = attempt.total_fields
    percentage = Decimal(correct_fields) / Decimal(total_fields) * Decimal(100)
    passing = attempt.config_snapshot.get("passing_percentage", 70)

    attempt.correct_fields = correct_fields
    attempt.fully_correct_questions = fully_correct
    attempt.percentage = float(round(percentage, 2))
    attempt.passed = float(percentage) >= passing
