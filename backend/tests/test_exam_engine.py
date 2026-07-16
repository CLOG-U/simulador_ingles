from collections import Counter

import pytest

from app.models.enums import PromptType
from app.services.exam_engine import build_balanced_prompt_types, sample_verb_ids


def test_build_balanced_prompt_types_distribution():
    types = build_balanced_prompt_types(20)
    counts = Counter(types)
    assert len(types) == 20
    assert sorted(counts.values()) == [6, 7, 7]
    assert set(counts.keys()) == set(PromptType)


@pytest.mark.parametrize("_", range(200))
def test_balanced_distribution_always_valid(_: int):
    types = build_balanced_prompt_types(20)
    counts = Counter(types)
    assert sum(counts.values()) == 20
    assert sorted(counts.values()) == [6, 7, 7]


def test_sample_verb_ids_unique():
    ids = list(range(100))
    picked = sample_verb_ids(ids, 20)
    assert len(picked) == 20
    assert len(set(picked)) == 20


def test_sample_verb_ids_insufficient():
    with pytest.raises(ValueError):
        sample_verb_ids([1, 2, 3], 20)
