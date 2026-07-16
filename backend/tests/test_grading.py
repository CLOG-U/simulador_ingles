import uuid
from datetime import UTC, datetime

import pytest

from app.models.enums import PromptType
from app.models.entities import AttemptQuestion
from app.services.grading_service import grade_question


def _question(**kwargs) -> AttemptQuestion:
    defaults = {
        "id": uuid.uuid4(),
        "attempt_id": uuid.uuid4(),
        "position": 1,
        "verb_id": uuid.uuid4(),
        "snapshot_base": "Do",
        "snapshot_past": "Did",
        "snapshot_spanish": "Hacer",
        "snapshot_spanish_prompt": "Hacer (una actividad o tarea)",
        "snapshot_valid_answers": {
            "BASE": ["do"],
            "PAST": ["did"],
            "SPANISH": ["hacer (una actividad o tarea)"],
        },
        "prompt_type": PromptType.FROM_SPANISH,
    }
    defaults.update(kwargs)
    return AttemptQuestion(**defaults)


def test_partial_credit_one_of_two():
    q = _question(
        answer_base_raw="do",
        answer_past_raw="done",
    )
    all_ok, _ = grade_question(q)
    assert q.is_base_correct is True
    assert q.is_past_correct is False
    assert all_ok is False


def test_spanish_accent_insensitive():
    q = _question(
        prompt_type=PromptType.FROM_BASE,
        answer_spanish_raw="Hacer (una actividad o tarea)",
        answer_past_raw="did",
    )
    all_ok, _ = grade_question(q)
    assert q.is_spanish_correct is True
    assert q.is_past_correct is True
    assert all_ok is True


def test_do_not_confused_with_make():
    q = _question(
        snapshot_valid_answers={
            "BASE": ["do"],
            "PAST": ["did"],
            "SPANISH": ["hacer (una actividad o tarea)"],
        },
        answer_base_raw="make",
        answer_past_raw="made",
    )
    grade_question(q)
    assert q.is_base_correct is False
    assert q.is_past_correct is False
