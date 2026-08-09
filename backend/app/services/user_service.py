import csv
import io
import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.security import generate_temporary_password, hash_password, normalize_username
from app.models import ExamAccess, ExamConfig, ExamType, RefreshSession, User, UserRole
from app.services.audit_service import log_audit


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise AppError(
            "WEAK_PASSWORD",
            "La contraseña debe tener al menos 8 caracteres.",
            status_code=400,
            field_errors={"password": ["Mínimo 8 caracteres"]},
        )


async def _ensure_username_available(
    session: AsyncSession, username: str, *, exclude_user_id: uuid.UUID | None = None
) -> str:
    normalized = normalize_username(username)
    if not normalized:
        raise AppError(
            "INVALID_USERNAME",
            "El nombre de usuario no es válido.",
            status_code=400,
            field_errors={"username": ["Ingresa un usuario válido"]},
        )
    query = select(User).where(User.username_normalized == normalized)
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    existing = await session.execute(query)
    if existing.scalar_one_or_none():
        raise AppError(
            "USERNAME_TAKEN",
            "El nombre de usuario ya está en uso.",
            status_code=409,
            field_errors={"username": ["Ya existe"]},
        )
    return normalized


async def _revoke_user_sessions(session: AsyncSession, user_id: uuid.UUID) -> None:
    result = await session.execute(
        select(RefreshSession).where(
            RefreshSession.user_id == user_id,
            RefreshSession.revoked_at.is_(None),
        )
    )
    now = datetime.now(UTC)
    for refresh_session in result.scalars():
        refresh_session.revoked_at = now


def _resolve_password(password: str | None) -> tuple[str, bool]:
    if password is not None:
        trimmed = password.strip()
        if not trimmed:
            generated = generate_temporary_password()
            return generated, True
        _validate_password(trimmed)
        return trimmed, False
    generated = generate_temporary_password()
    return generated, True


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
    actor_role: UserRole,
    username: str,
    full_name: str,
    role: UserRole,
    password: str | None = None,
) -> tuple[User, str]:
    if role == UserRole.SUPERADMIN:
        raise AppError(
            "INVALID_ROLE",
            "No se pueden crear cuentas Superadmin desde el panel. "
            "Usa el script de bootstrap.",
            status_code=400,
        )
    if role == UserRole.ADMIN and actor_role != UserRole.SUPERADMIN:
        raise AppError(
            "FORBIDDEN",
            "Solo el Superadmin puede crear otros administradores.",
            status_code=403,
        )
    if role not in {UserRole.ADMIN, UserRole.STUDENT}:
        raise AppError(
            "INVALID_ROLE",
            "Rol inválido. Elige Administrador o Estudiante.",
            status_code=400,
        )

    normalized = await _ensure_username_available(session, username)
    assigned_password, must_change_password = _resolve_password(password)

    user = User(
        id=uuid.uuid4(),
        username=username.strip(),
        username_normalized=normalized,
        full_name=full_name.strip(),
        password_hash=hash_password(assigned_password),
        role=role,
        is_active=True,
        must_change_password=must_change_password,
    )
    session.add(user)
    if role == UserRole.STUDENT:
        config_result = await session.execute(select(ExamConfig).limit(1))
        config = config_result.scalar_one_or_none()
        session.add_all(
            [
                ExamAccess(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    exam_type=ExamType.VERB_EXAM.value,
                    is_enabled=True,
                    practice_enabled=False,
                    allowed_attempts=config.max_attempts if config else 1,
                ),
                ExamAccess(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    exam_type=ExamType.PAST_SIMPLE_EXAM.value,
                    is_enabled=False,
                    practice_enabled=False,
                    allowed_attempts=1,
                ),
            ]
        )
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
    return user, assigned_password


async def update_user(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    actor_role: UserRole,
    user: User,
    username: str | None = None,
    full_name: str | None = None,
    password: str | None = None,
    is_active: bool | None = None,
) -> User:
    if actor_role == UserRole.ADMIN and user.role != UserRole.STUDENT:
        raise AppError(
            "FORBIDDEN",
            "Los administradores solo pueden editar cuentas de estudiantes.",
            status_code=403,
        )
    if username is not None:
        normalized = await _ensure_username_available(session, username, exclude_user_id=user.id)
        user.username = username.strip()
        user.username_normalized = normalized
    if full_name is not None:
        user.full_name = full_name.strip()
    if password is not None:
        assigned_password, must_change_password = _resolve_password(password)
        user.password_hash = hash_password(assigned_password)
        user.must_change_password = must_change_password
        await _revoke_user_sessions(session, user.id)
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


async def delete_user(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    actor_role: UserRole,
    user: User,
) -> dict:
    if user.id == actor_id:
        raise AppError(
            "CANNOT_DELETE_SELF",
            "No puedes eliminar tu propia cuenta.",
            status_code=400,
        )
    if actor_role == UserRole.ADMIN and user.role != UserRole.STUDENT:
        raise AppError(
            "FORBIDDEN",
            "Los administradores solo pueden eliminar cuentas de estudiantes.",
            status_code=403,
        )
    if user.role == UserRole.SUPERADMIN:
        if actor_role != UserRole.SUPERADMIN:
            raise AppError(
                "FORBIDDEN",
                "Solo un Superadmin puede eliminar otra cuenta Superadmin.",
                status_code=403,
            )
        superadmin_count = (
            await session.execute(
                select(func.count())
                .select_from(User)
                .where(User.role == UserRole.SUPERADMIN)
            )
        ).scalar_one()
        if superadmin_count <= 1:
            raise AppError(
                "LAST_SUPERADMIN",
                "No se puede eliminar el único Superadmin del sistema.",
                status_code=400,
            )
    elif user.role == UserRole.ADMIN and actor_role != UserRole.SUPERADMIN:
        raise AppError(
            "FORBIDDEN",
            "Solo el Superadmin puede eliminar administradores.",
            status_code=403,
        )

    await _revoke_user_sessions(session, user.id)
    await log_audit(
        session,
        actor_user_id=actor_id,
        action="USER_DELETED",
        target_type="user",
        target_id=str(user.id),
        metadata={
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    )
    await session.execute(delete(User).where(User.id == user.id))
    await session.commit()
    return {
        "id": str(user.id),
        "username": user.username,
        "role": user.role.value,
    }


async def reset_password(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    actor_role: UserRole,
    user: User,
    password: str | None = None,
) -> str:
    if actor_role == UserRole.ADMIN and user.role != UserRole.STUDENT:
        raise AppError(
            "FORBIDDEN",
            "Los administradores solo pueden restablecer claves de estudiantes.",
            status_code=403,
        )
    assigned_password, must_change_password = _resolve_password(password)
    user.password_hash = hash_password(assigned_password)
    user.must_change_password = must_change_password
    user.updated_at = datetime.now(UTC)
    await _revoke_user_sessions(session, user.id)
    await log_audit(
        session,
        actor_user_id=actor_id,
        action="PASSWORD_RESET",
        target_type="user",
        target_id=str(user.id),
    )
    await session.commit()
    return assigned_password


async def import_users_csv(
    session: AsyncSession,
    *,
    actor_id: uuid.UUID,
    actor_role: UserRole,
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
            actor_role=actor_role,
            username=row["username"],
            full_name=row["full_name"],
            role=UserRole.STUDENT,
        )
        created.append((user, temp))
    return created
