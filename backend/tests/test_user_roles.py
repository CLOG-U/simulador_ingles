import uuid

import pytest

from app.core.errors import AppError
from app.core.security import hash_password
from app.models import User, UserRole
from app.services import user_service


def _user(*, role: UserRole, username: str) -> User:
    return User(
        id=uuid.uuid4(),
        username=username,
        username_normalized=username.casefold(),
        full_name=username,
        password_hash=hash_password("temporary123"),
        role=role,
        is_active=True,
        must_change_password=False,
    )


@pytest.mark.asyncio
async def test_only_superadmin_can_create_admin(db_session):
    superadmin = _user(role=UserRole.SUPERADMIN, username="super_role")
    admin = _user(role=UserRole.ADMIN, username="admin_role")
    db_session.add_all([superadmin, admin])
    await db_session.commit()

    created, _ = await user_service.create_user(
        db_session,
        actor_id=superadmin.id,
        actor_role=UserRole.SUPERADMIN,
        username=f"new_admin_{uuid.uuid4().hex[:6]}",
        full_name="Nuevo Admin",
        role=UserRole.ADMIN,
    )
    assert created.role == UserRole.ADMIN

    with pytest.raises(AppError) as exc:
        await user_service.create_user(
            db_session,
            actor_id=admin.id,
            actor_role=UserRole.ADMIN,
            username=f"blocked_admin_{uuid.uuid4().hex[:6]}",
            full_name="Bloqueado",
            role=UserRole.ADMIN,
        )
    assert exc.value.code == "FORBIDDEN"


@pytest.mark.asyncio
async def test_cannot_create_superadmin_via_service(db_session):
    superadmin = _user(role=UserRole.SUPERADMIN, username="super_create")
    db_session.add(superadmin)
    await db_session.commit()

    with pytest.raises(AppError) as exc:
        await user_service.create_user(
            db_session,
            actor_id=superadmin.id,
            actor_role=UserRole.SUPERADMIN,
            username=f"bad_super_{uuid.uuid4().hex[:6]}",
            full_name="Bad Super",
            role=UserRole.SUPERADMIN,
        )
    assert exc.value.code == "INVALID_ROLE"


@pytest.mark.asyncio
async def test_admin_can_only_delete_students(db_session):
    admin = _user(role=UserRole.ADMIN, username="admin_del")
    student = _user(role=UserRole.STUDENT, username="student_del")
    other_admin = _user(role=UserRole.ADMIN, username="other_admin_del")
    db_session.add_all([admin, student, other_admin])
    await db_session.commit()

    result = await user_service.delete_user(
        db_session,
        actor_id=admin.id,
        actor_role=UserRole.ADMIN,
        user=student,
    )
    assert result["username"] == "student_del"

    with pytest.raises(AppError) as exc:
        await user_service.delete_user(
            db_session,
            actor_id=admin.id,
            actor_role=UserRole.ADMIN,
            user=other_admin,
        )
    assert exc.value.code == "FORBIDDEN"
