"""Pruebas unitarias de los módulos de examen nuevos (sin BD)."""

from collections import Counter
from types import SimpleNamespace

from app.models.enums import ExamType, PresentPerfectTopic, PresentSimpleTopic
from app.services.present_perfect_engine import (
    select_balanced_questions as select_present_perfect,
)
from app.services.present_simple_engine import select_balanced_questions
from app.services.verb_base_service import build_base_prompt_types
from seed.listening_data import LISTENING_QUESTIONS
from seed.present_perfect_data import PRESENT_PERFECT_QUESTIONS
from seed.present_simple_data import PRESENT_SIMPLE_QUESTIONS


def test_exam_types_include_new_modules():
    values = {item.value for item in ExamType}
    assert "verb_base_exam" in values
    assert "present_simple_exam" in values
    assert "present_perfect_exam" in values
    assert "listening_practice" in values


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


def test_present_simple_selection_returns_20_balanced():
    bank = [
        SimpleNamespace(active=True, topic=item.topic, id=index)
        for index, item in enumerate(PRESENT_SIMPLE_QUESTIONS)
    ]
    selected = select_balanced_questions(bank, count=20)
    assert len(selected) == 20
    counts = Counter(q.topic for q in selected)
    assert set(counts) == {topic.value for topic in PresentSimpleTopic}
    assert min(counts.values()) >= 2
    assert max(counts.values()) <= 3


def test_present_perfect_seed_covers_all_topics():
    counts = Counter(q.topic for q in PRESENT_PERFECT_QUESTIONS)
    for topic in PresentPerfectTopic:
        assert counts[topic.value] >= 13, topic.value
    assert len(PRESENT_PERFECT_QUESTIONS) == 100


def test_present_perfect_selection_returns_20_balanced():
    bank = [
        SimpleNamespace(active=True, topic=item.topic, id=index)
        for index, item in enumerate(PRESENT_PERFECT_QUESTIONS)
    ]
    selected = select_present_perfect(bank, count=20)
    assert len(selected) == 20
    counts = Counter(q.topic for q in selected)
    assert set(counts) == {topic.value for topic in PresentPerfectTopic}
    assert min(counts.values()) >= 2
    assert max(counts.values()) <= 3


def test_listening_seed_covers_leo_manta_clip():
    assert len(LISTENING_QUESTIONS) == 10
    assert {item.clip_key for item in LISTENING_QUESTIONS} == {"leo-manta"}
    assert all(item.audio_url == "/audio/leo-manta.mp3" for item in LISTENING_QUESTIONS)
    topics = {item.topic for item in LISTENING_QUESTIONS}
    assert {"present_simple", "past_simple", "present_perfect", "detail"} <= topics
    assert all(item.question_type == "multiple_choice" for item in LISTENING_QUESTIONS)
    assert all(item.options and len(item.options) == 4 for item in LISTENING_QUESTIONS)
    assert all(item.correct_answer in item.options for item in LISTENING_QUESTIONS)
