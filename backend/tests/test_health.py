import pytest
from sqlalchemy import func, select

from app.models import Verb


@pytest.mark.integration
@pytest.mark.asyncio
async def test_readiness_with_database(client, db_session):
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_seed_loaded_73_verbs(db_session):
    result = await db_session.execute(select(func.count()).select_from(Verb))
    count = result.scalar_one()
    assert count == 73
