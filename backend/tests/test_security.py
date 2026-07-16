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
