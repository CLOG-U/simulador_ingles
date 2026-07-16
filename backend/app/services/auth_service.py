import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    normalize_username,
    verify_password,
)
from app.models import RefreshSession, User, UserRole
from app.services.audit_service import log_audit

INVALID_CREDENTIALS = "Credenciales inválidas"
SESSION_EXPIRED = "Sesión expirada. Inicia sesión de nuevo."


async def login(
    session: AsyncSession,
    *,
    username: str,
    password: str,
    ip_address: str | None = None,
    device_info: str | None = None,
) -> tuple[User, str, str]:
    normalized = normalize_username(username)
    result = await session.execute(select(User).where(User.username_normalized == normalized))
    user = result.scalar_one_or_none()

    if user is None:
        await asyncio.sleep(0.5)
        raise AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS, status_code=401)

    now = datetime.now(UTC)
    if not user.is_active:
        raise AppError("ACCOUNT_INACTIVE", INVALID_CREDENTIALS, status_code=401)

    if user.locked_until and user.locked_until > now:
        raise AppError("ACCOUNT_LOCKED", INVALID_CREDENTIALS, status_code=401)

    if not verify_password(user.password_hash, password):
        user.failed_login_count += 1
        if user.failed_login_count >= settings.max_login_attempts:
            user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
            user.failed_login_count = 0
        delay = min(user.failed_login_count * 0.3, 2.0)
        await session.commit()
        await asyncio.sleep(delay)
        raise AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS, status_code=401)

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now

    access_token = create_access_token(user_id=str(user.id), role=user.role.value)
    refresh_token = generate_refresh_token()
    refresh_session = RefreshSession(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        device_info=device_info,
        ip_address=ip_address,
    )
    session.add(refresh_session)
    await session.commit()
    await session.refresh(user)
    return user, access_token, refresh_token


async def refresh_tokens(
    session: AsyncSession,
    *,
    refresh_token: str,
    ip_address: str | None = None,
    device_info: str | None = None,
) -> tuple[User, str, str]:
    token_hash = hash_token(refresh_token)
    now = datetime.now(UTC)
    result = await session.execute(
        select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.revoked_at.is_(None),
            RefreshSession.expires_at > now,
        )
    )
    refresh_session = result.scalar_one_or_none()
    if refresh_session is None:
        raise AppError("INVALID_REFRESH", SESSION_EXPIRED, status_code=401)

    user_result = await session.execute(select(User).where(User.id == refresh_session.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise AppError("INVALID_REFRESH", SESSION_EXPIRED, status_code=401)

    refresh_session.revoked_at = now
    new_refresh = generate_refresh_token()
    session.add(
        RefreshSession(
            id=uuid.uuid4(),
            user_id=user.id,
            token_hash=hash_token(new_refresh),
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
            device_info=device_info,
            ip_address=ip_address,
        )
    )
    access_token = create_access_token(user_id=str(user.id), role=user.role.value)
    await session.commit()
    await session.refresh(user)
    return user, access_token, new_refresh


async def logout(session: AsyncSession, *, refresh_token: str | None) -> None:
    if not refresh_token:
        return
    token_hash = hash_token(refresh_token)
    result = await session.execute(
        select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.revoked_at.is_(None),
        )
    )
    refresh_session = result.scalar_one_or_none()
    if refresh_session:
        refresh_session.revoked_at = datetime.now(UTC)
        await session.commit()


async def change_password(
    session: AsyncSession,
    *,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if len(new_password) < 8:
        raise AppError(
            "WEAK_PASSWORD",
            "La contraseña debe tener al menos 8 caracteres.",
            status_code=400,
            field_errors={"new_password": ["Mínimo 8 caracteres"]},
        )

    if not verify_password(user.password_hash, current_password):
        raise AppError(
            "INVALID_CREDENTIALS", "La contraseña actual es incorrecta.", status_code=400
        )

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.updated_at = datetime.now(UTC)

    result = await session.execute(
        select(RefreshSession).where(
            RefreshSession.user_id == user.id,
            RefreshSession.revoked_at.is_(None),
        )
    )
    now = datetime.now(UTC)
    for refresh_session in result.scalars():
        refresh_session.revoked_at = now

    await log_audit(
        session,
        actor_user_id=user.id,
        action="PASSWORD_CHANGED",
        target_type="user",
        target_id=str(user.id),
    )
    await session.commit()


def user_from_access_token(token: str) -> tuple[uuid.UUID, UserRole]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise AppError("UNAUTHORIZED", "No autorizado", status_code=401) from exc
    if payload.get("type") != "access":
        raise AppError("UNAUTHORIZED", "No autorizado", status_code=401)
    return uuid.UUID(payload["sub"]), UserRole(payload["role"])
