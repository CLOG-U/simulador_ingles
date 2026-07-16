import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client_no_db():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_liveness_without_database(client_no_db):
    response = await client_no_db.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
