"""Unit tests for LMS helpers (no DB required)."""

import pytest

from app.core.errors import AppError
from app.services.resource_service import _validate_url


def test_validate_url_accepts_https():
    assert _validate_url("https://example.com/file.pdf").startswith("https://")


def test_validate_url_rejects_javascript():
    with pytest.raises(AppError) as exc:
        _validate_url("javascript:alert(1)")
    assert exc.value.code == "INVALID_URL"


def test_validate_url_rejects_blank():
    with pytest.raises(AppError):
        _validate_url("not-a-url")
