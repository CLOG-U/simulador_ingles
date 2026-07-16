import csv
import io
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import generate_temporary_password, hash_password, normalize_username
from app.models import User, UserRole
from app.services.audit_service import log_audit


async def list_users(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    role: UserRole | None = None,
) -> tuple[list[User], int]:
    page_size = min(page_size, 100)
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        term = f"%{search.strip().casefold()}%"
        query = query.where(
            User.username_normalized.ilike(term) | User.full_name.ilike(term)
        )
        count_query = count_query.where(
            User.username_normalized.ilike(term) | User.full_name.ilike(term)
        )
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    total = (await session.execute(count_query)).scalar_one()
    result = await session.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars()), total


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppError("NOT_FOUND", "Usuario no encontrado", status_code=404)
    return user


async def create_user(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    username: str,
    full_name: str,
    role: UserRole,
) -> tuple[User, str]:
    normalized = normalize_username(username)
    existing = await session.execute(select(User).where(User.username_normalized == normalized))
    if existing.scalar_one_or_none():
        raise AppError(
            "USERNAME_TAKEN",
            "El nombre de usuario ya está en uso.",
            status_code=409,
            field_errors={"username": ["Ya existe"]},
        )

    temp_password = generate_temporary_password()
    user = User(
        id=uuid.uuid4(),
        username=username.strip(),
        username_normalized=normalized,
        full_name=full_name.strip(),
        password_hash=hash_password(temp_password),
        role=role,
        is_active=True,
        must_change_password=True,
    )
    session.add(user)
    await log_audit(
        session,
        actor_user_id=actor_id,
        action="USER_CREATED",
        target_type="user",
        target_id=str(user.id),
        metadata={"username": user.username, "role": role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user, temp_password


async def update_user(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    user: User,
    full_name: str | None = None,
    is_active: bool | None = None,
) -> User:
    if full_name is not None:
        user.full_name = full_name.strip()
    if is_active is not None:
        user.is_active = is_active
    user.updated_at = datetime.now(UTC)

    await log_audit(
        session,
        actor_user_id=actor_id,
        action="USER_UPDATED",
        target_type="user",
        target_id=str(user.id),
    )
    await session.commit()
    await session.refresh(user)
    return user


async def reset_password(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    user: User,
) -> str:
    temp_password = generate_temporary_password()
    user.password_hash = hash_password(temp_password)
    user.must_change_password = True
    await log_audit(
        session,
        actor_user_id=actor_id,
        action="PASSWORD_RESET",
        target_type="user",
        target_id=str(user.id),
    )
    await session.commit()
    return temp_password


async def import_users_csv(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    content: str,
) -> list[tuple[User, str]]:
    reader = csv.DictReader(io.StringIO(content))
    required = {"username", "full_name"}
    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
        raise AppError(
            "INVALID_CSV",
            "El CSV debe incluir columnas username y full_name.",
            status_code=400,
        )

    created: list[tuple[User, str]] = []
    for row in reader:
        if len(created) >= 500:
            break
        user, temp = await create_user(
            session,
            actor_id=actor_id,
            username=row["username"],
            full_name=row["full_name"],
            role=UserRole.STUDENT,
        )
        created.append((user, temp))
    return created
