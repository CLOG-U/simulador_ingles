from datetime import UTC, datetime
from decimal import Decimal

from app.models import PresentPerfectAttempt, PresentPerfectAttemptQuestion
from app.services.normalization import normalize_english_answer

TOPIC_LABELS = {
    "affirmative": "Affirmative",
    "negative": "Negative",
    "interrogative": "Interrogative",
    "short_answers": "Short answers",
    "identify": "Identify",
    "order_words": "Order",
    "sentences": "Sentences",
}


def grade_question(question: PresentPerfectAttemptQuestion) -> bool | None:
    raw = question.answer_raw
    if raw is None or not raw.strip():
        question.is_correct = None
        question.graded_at = datetime.now(UTC)
        return None

    accepted = [
        question.snapshot_correct_answer,
        *question.snapshot_accepted_answers,
    ]
    normalized_answer = normalize_english_answer(raw)
    question.is_correct = normalized_answer in {
        normalize_english_answer(value) for value in accepted
    }
    question.graded_at = datetime.now(UTC)
    return question.is_correct


def grade_attempt(attempt: PresentPerfectAttempt) -> None:
    grades = [grade_question(question) for question in attempt.questions]
    _apply_grade_totals(attempt, grades)


def recompute_attempt_from_grades(attempt: PresentPerfectAttempt) -> None:
    """Recalcula totales respetando marcas actuales (override admin)."""
    _apply_grade_totals(attempt, [question.is_correct for question in attempt.questions])


def _apply_grade_totals(
    attempt: PresentPerfectAttempt, grades: list[bool | None]
) -> None:
    correct = sum(grade is True for grade in grades)
    unanswered = sum(grade is None for grade in grades)
    incorrect = len(grades) - correct - unanswered
    total = attempt.total_questions or len(grades) or 1
    percentage = Decimal(correct) / Decimal(total) * Decimal(100)

    attempt.correct_answers = correct
    attempt.incorrect_answers = incorrect
    attempt.unanswered_answers = unanswered
    attempt.percentage = float(round(percentage, 2))
    attempt.score_out_of_ten = float(round(percentage / Decimal(10), 2))
    attempt.passed = float(percentage) >= attempt.config_snapshot.get(
        "passing_percentage", 70
    )


def topic_performance(attempt: PresentPerfectAttempt) -> list[dict]:
    grouped: dict[str, dict[str, int | str]] = {}
    for question in sorted(attempt.questions, key=lambda item: item.position):
        topic = question.snapshot_topic
        row = grouped.setdefault(
            topic,
            {
                "topic": topic,
                "topic_label": TOPIC_LABELS.get(topic, topic),
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "unanswered": 0,
            },
        )
        row["total"] = int(row["total"]) + 1
        if question.is_correct is True:
            row["correct"] = int(row["correct"]) + 1
        elif question.is_correct is False:
            row["incorrect"] = int(row["incorrect"]) + 1
        else:
            row["unanswered"] = int(row["unanswered"]) + 1

    rows: list[dict] = []
    for row in grouped.values():
        total = int(row["total"])
        correct = int(row["correct"])
        rows.append({**row, "percentage": round(correct / total * 100, 2)})
    return rows


def automatic_observation(attempt: PresentPerfectAttempt) -> dict[str, list[str]]:
    performance = topic_performance(attempt)
    return {
        "strong_topics": [
            str(row["topic_label"])
            for row in performance
            if float(row["percentage"]) >= 75
        ],
        "topics_to_review": [
            str(row["topic_label"])
            for row in performance
            if float(row["percentage"]) < 70
        ],
    }
