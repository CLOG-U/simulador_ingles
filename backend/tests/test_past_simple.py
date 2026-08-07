import uuid
from collections import Counter

from app.models import (
    PastSimpleAttempt,
    PastSimpleAttemptQuestion,
    PastSimpleQuestion,
    PastSimpleTopic,
)
from app.services.normalization import normalize_english_answer
from app.services.past_simple_engine import select_balanced_questions
from app.services.past_simple_grading import (
    automatic_observation,
    grade_attempt,
    topic_performance,
)
from seed.past_simple_data import PAST_SIMPLE_QUESTIONS


def test_question_bank_has_four_items_per_topic():
    counts = Counter(item.topic for item in PAST_SIMPLE_QUESTIONS)
    assert len(PAST_SIMPLE_QUESTIONS) == 48
    assert set(counts) == {topic.value for topic in PastSimpleTopic}
    assert set(counts.values()) == {4}
    assert len({item.stable_key for item in PAST_SIMPLE_QUESTIONS}) == 48
    assert all(
        item.correct_answer in item.options
        for item in PAST_SIMPLE_QUESTIONS
        if item.options
    )


def test_balanced_selection_returns_two_questions_per_topic():
    questions = [
        PastSimpleQuestion(
            id=uuid.uuid4(),
            stable_key=item.stable_key,
            exam_type="past_simple_exam",
            topic=item.topic,
            question_type=item.question_type,
            instruction=item.instruction,
            question=item.question,
            options=item.options,
            correct_answer=item.correct_answer,
            accepted_answers=item.accepted_answers,
            explanation=item.explanation,
            points=item.points,
            active=item.active,
        )
        for item in PAST_SIMPLE_QUESTIONS
    ]
    selected = select_balanced_questions(questions)
    counts = Counter(item.topic for item in selected)
    assert len(selected) == 24
    assert len({item.id for item in selected}) == 24
    assert set(counts.values()) == {2}


def test_english_normalization_accepts_formatting_but_not_grammar_errors():
    expected = normalize_english_answer("What did she study yesterday?")
    assert normalize_english_answer("  WHAT   DID she study yesterday. ") == expected
    assert normalize_english_answer("No, she didn’t.") == "no she didn't"
    assert normalize_english_answer("What did she studied yesterday?") != expected
    assert normalize_english_answer("What she did study yesterday?") != expected


def _attempt_question(
    *,
    position: int,
    topic: str,
    answer: str | None,
    correct_answer: str,
) -> PastSimpleAttemptQuestion:
    return PastSimpleAttemptQuestion(
        id=uuid.uuid4(),
        attempt_id=uuid.uuid4(),
        source_question_id=None,
        position=position,
        snapshot_topic=topic,
        snapshot_question_type="fill_blank",
        snapshot_instruction="Complete.",
        snapshot_question="Question",
        snapshot_options=None,
        snapshot_correct_answer=correct_answer,
        snapshot_accepted_answers=[],
        snapshot_explanation="Explanation",
        snapshot_points=1,
        answer_raw=answer,
    )


def test_grading_calculates_summary_topics_and_observation():
    attempt = PastSimpleAttempt(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        attempt_number=1,
        config_snapshot={"passing_percentage": 70},
        total_questions=4,
        questions=[
            _attempt_question(
                position=1,
                topic="use_of_did",
                answer="Did",
                correct_answer="Did",
            ),
            _attempt_question(
                position=2,
                topic="use_of_did",
                answer="did.",
                correct_answer="Did",
            ),
            _attempt_question(
                position=3,
                topic="was_were",
                answer="was",
                correct_answer="Were",
            ),
            _attempt_question(
                position=4,
                topic="was_were",
                answer=None,
                correct_answer="Was",
            ),
        ],
    )

    grade_attempt(attempt)

    assert attempt.correct_answers == 2
    assert attempt.incorrect_answers == 1
    assert attempt.unanswered_answers == 1
    assert float(attempt.percentage) == 50
    assert float(attempt.score_out_of_ten) == 5
    assert attempt.passed is False

    performance = {item["topic"]: item for item in topic_performance(attempt)}
    assert performance["use_of_did"]["percentage"] == 100
    assert performance["was_were"]["percentage"] == 0
    observation = automatic_observation(attempt)
    assert "Use of did" in observation["strong_topics"]
    assert "Was and were" in observation["topics_to_review"]
