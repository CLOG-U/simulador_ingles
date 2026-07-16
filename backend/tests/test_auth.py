import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, normalize_username
from app.main import app
from app.models import User, UserRole


@pytest.fixture
async def auth_client(db_session: AsyncSession):
    from app.core.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def student_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        username="estudiante1",
        username_normalized=normalize_username("estudiante1"),
        full_name="Estudiante Uno",
        password_hash=hash_password("temporal123"),
        role=UserRole.STUDENT,
        is_active=True,
        must_change_password=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_success(auth_client, student_user):
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"username": "estudiante1", "password": "temporal123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == "estudiante1"
    assert data["must_change_password"] is True
    assert "access_token" in response.cookies


@pytest.mark.integration
@pytest.mark.asyncio
async def test_login_invalid_credentials(auth_client, student_user):
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"username": "estudiante1", "password": "incorrecta"},
    )
    assert response.status_code == 401
    assert response.json()["message"] == "Credenciales inválidas"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_me_requires_auth(auth_client):
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 401
