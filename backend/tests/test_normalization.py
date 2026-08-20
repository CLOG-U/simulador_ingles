import pytest

from app.services.normalization import (
    expand_spanish_alternatives,
    normalize_english_answer,
    normalize_spanish,
    normalize_text,
    spanish_answer_matches,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("  Go  ", "go"),
        ("Wake   Up", "wake up"),
        ("WENT", "went"),
    ],
)
def test_normalize_text(raw: str, expected: str) -> None:
    assert normalize_text(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Ir", "ir"),
        ("Tomar", "tomar"),
        ("Decir", "decir"),
    ],
)
def test_normalize_spanish_strips_accents(raw: str, expected: str) -> None:
    assert normalize_spanish(raw) == expected


def test_normalize_spanish_accent_equivalence() -> None:
    assert normalize_spanish("Decir") == normalize_spanish("decir")


@pytest.mark.parametrize(
    "raw",
    [
        "No, she didn't.",
        "No, she didn´t.",
        "No, she didn`t.",
        "No, she did not.",
        "no she did not",
    ],
)
def test_normalize_english_answer_flexible_negatives(raw: str) -> None:
    assert normalize_english_answer(raw) == "no she did not"


def test_expand_spanish_alternatives_tell() -> None:
    alts = expand_spanish_alternatives("Decir o contar (a alguien)")
    assert "decir" in alts
    assert "contar" in alts
    assert "decir o contar" in alts
    assert "a alguien" not in alts


def test_spanish_answer_matches_natural_variants() -> None:
    valid = ["Decir o contar (a alguien)"]
    assert spanish_answer_matches("decir", valid)
    assert spanish_answer_matches("contar", valid)
    assert spanish_answer_matches("Decir o contar", valid)
    assert not spanish_answer_matches("a alguien", valid)
    assert spanish_answer_matches("intentar", ["Intentar, tratar"])
    assert spanish_answer_matches("tratar", ["Intentar, tratar"])
    assert spanish_answer_matches("dejar", ["Salir o dejar"])
    assert spanish_answer_matches("salir", ["Salir o dejar"])
