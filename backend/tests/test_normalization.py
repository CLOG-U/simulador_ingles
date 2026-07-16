import pytest

from app.services.normalization import normalize_spanish, normalize_text


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
