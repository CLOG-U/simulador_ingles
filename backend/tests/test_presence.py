import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, normalize_username
from app.main import app
from app.models import User, UserRole
from app.schemas.user import AdminUserResponse
from app.services.presence_service import ONLINE_THRESHOLD, is_online


def test_is_online_recent_activity():
    now = datetime(2026, 9, 3, 22, 0, tzinfo=UTC)
    assert is_online(now - timedelta(minutes=2), now=now) is True
    assert is_online(now - ONLINE_THRESHOLD, now=now) is True


def test_is_online_stale_or_missing():
    now = datetime(2026, 9, 3, 22, 0, tzinfo=UTC)
    assert is_online(now - timedelta(minutes=4), now=now) is False
    assert is_online(None, now=now) is False


def test_admin_user_response_marks_online_from_last_seen():
    now = datetime.now(UTC)
    payload = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        username="ana",
        full_name="Ana Pérez",
        role=UserRole.STUDENT,
        is_active=True,
        must_change_password=False,
        created_at=now,
        last_login_at=now,
        last_seen_at=now,
        attempts_used=None,
        attempts_max=None,
        attempts_remaining=None,
        has_open_attempt=None,
        exam_access=[],
    )
    online = AdminUserResponse.model_validate(payload)
    assert online.is_online is True

    payload.last_seen_at = now - timedelta(minutes=10)
    offline = AdminUserResponse.model_validate(payload)
    assert offline.is_online is False


@pytest.fixture
async def presence_client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_admin_sees_student_online_after_activity(
    presence_client, db_session: AsyncSession
):
    student = User(
        id=uuid.uuid4(),
        username="ana",
        username_normalized=normalize_username("ana"),
        full_name="Ana Pérez",
        password_hash=hash_password("temporal123"),
        role=UserRole.STUDENT,
        is_active=True,
        must_change_password=False,
    )
    admin = User(
        id=uuid.uuid4(),
        username="profe",
        username_normalized=normalize_username("profe"),
        full_name="Profesor",
        password_hash=hash_password("temporal123"),
        role=UserRole.ADMIN,
        is_active=True,
        must_change_password=False,
    )
    db_session.add_all([student, admin])
    await db_session.commit()

    student_login = await presence_client.post(
        "/api/v1/auth/login",
        json={"username": "ana", "password": "temporal123"},
    )
    assert student_login.status_code == 200
    ping = await presence_client.post(
        "/api/v1/auth/presence",
        headers={
            "Authorization": f"Bearer {student_login.json()['access_token']}"
        },
    )
    assert ping.status_code == 200

    admin_login = await presence_client.post(
        "/api/v1/auth/login",
        json={"username": "profe", "password": "temporal123"},
    )
    online = await presence_client.get(
        "/api/v1/admin/users/online",
        headers={"Authorization": f"Bearer {admin_login.json()['access_token']}"},
    )
    assert online.status_code == 200
    body = online.json()
    usernames = {item["username"] for item in body["items"]}
    assert "ana" in usernames
    assert body["student_count"] >= 1

    await presence_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": student_login.json()["refresh_token"]},
    )
    after_logout = await presence_client.get(
        "/api/v1/admin/users/online",
        headers={"Authorization": f"Bearer {admin_login.json()['access_token']}"},
    )
    assert "ana" not in {item["username"] for item in after_logout.json()["items"]}
