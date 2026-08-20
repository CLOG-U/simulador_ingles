"""Pruebas unitarias de los módulos de examen nuevos (sin BD)."""

from collections import Counter

from app.models.enums import ExamType, PresentSimpleTopic
from app.services.verb_base_service import build_base_prompt_types
from seed.present_simple_data import PRESENT_SIMPLE_QUESTIONS


def test_exam_types_include_new_modules():
    values = {item.value for item in ExamType}
    assert "verb_base_exam" in values
    assert "present_simple_exam" in values


def test_verb_base_prompt_types_balanced():
    types = build_base_prompt_types(20)
    assert len(types) == 20
    assert types.count("FROM_SPANISH") == 10
    assert types.count("FROM_BASE") == 10
    assert "FROM_PAST" not in types


def test_present_simple_seed_covers_all_topics():
    counts = Counter(q.topic for q in PRESENT_SIMPLE_QUESTIONS)
    for topic in PresentSimpleTopic:
        assert counts[topic.value] >= 13, topic.value
    assert len(PRESENT_SIMPLE_QUESTIONS) == 100
