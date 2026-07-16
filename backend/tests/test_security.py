from starlette.responses import Response

from app.core.config import Settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    normalize_username,
    verify_password,
)


def test_normalize_username_casefold():
    assert normalize_username("  JuanPerez  ") == "juanperez"


def test_password_hash_and_verify():
    hashed = hash_password("clave-segura-123")
    assert verify_password(hashed, "clave-segura-123")
    assert not verify_password(hashed, "otra-clave")


def test_access_token_roundtrip():
    token = create_access_token(user_id="user-1", role="STUDENT")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "STUDENT"


def test_hash_token_is_deterministic():
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("xyz")


def test_cors_origins_strip_trailing_slash():
    settings = Settings(cors_origins="https://simulador-api-8jwy.onrender.com/, http://localhost:5173/")
    assert settings.cors_origins_list == [
        "https://simulador-api-8jwy.onrender.com",
        "http://localhost:5173",
    ]


def test_cookie_flags_development():
    settings = Settings(environment="development")
    assert settings.cookie_secure is False
    assert settings.cookie_samesite == "lax"


def test_cookie_flags_production():
    settings = Settings(environment="production")
    assert settings.cookie_secure is True
    assert settings.cookie_samesite == "none"


def test_set_auth_cookies_uses_settings_samesite(monkeypatch):
    from app.core import cookies as cookies_module

    monkeypatch.setattr(cookies_module, "settings", Settings(environment="production"))

    response = Response()
    set_auth_cookies(response, access_token="access", refresh_token="refresh")
    header = response.headers.getlist("set-cookie")
    assert len(header) == 2
    for cookie in header:
        assert "HttpOnly" in cookie
        assert "Secure" in cookie
        assert "SameSite=none" in cookie


def test_clear_auth_cookies_uses_settings_samesite(monkeypatch):
    from app.core import cookies as cookies_module

    monkeypatch.setattr(cookies_module, "settings", Settings(environment="production"))

    response = Response()
    clear_auth_cookies(response)
    header = response.headers.getlist("set-cookie")
    assert len(header) == 2
    for cookie in header:
        assert "SameSite=none" in cookie
