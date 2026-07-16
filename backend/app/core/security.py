import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher()
JWT_ALGORITHM = "HS256"


def normalize_username(username: str) -> str:
    return username.strip().casefold()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        _password_hasher.verify(password_hash, password)
        if _password_hasher.check_needs_rehash(password_hash):
            return True
        return True
    except VerifyMismatchError:
        return False


def create_access_token(*, user_id: str, role: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_temporary_password() -> str:
    return secrets.token_urlsafe(9)
