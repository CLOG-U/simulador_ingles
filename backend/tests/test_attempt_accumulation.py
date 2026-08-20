import uuid

import pytest

from app.core.security import hash_password
from app.models import ExamType, User, UserRole
from app.services import exam_access_service

pytestmark = pytest.mark.integration


async def _make_student(db_session, username: str) -> User:
    user = User(
        id=uuid.uuid4(),
        username=username,
        username_normalized=username.casefold(),
        full_name="Student Test",
        password_hash=hash_password("Password123!"),
        role=UserRole.STUDENT,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.mark.asyncio
async def test_authorize_new_attempt_accumulates_cupo(db_session):
    student = await _make_student(db_session, f"accum_{uuid.uuid4().hex[:8]}")
    actor_id = uuid.uuid4()

    access = await exam_access_service.get_or_create_access(
        db_session,
        user_id=student.id,
        exam_type=ExamType.VERB_EXAM,
    )
    assert access.allowed_attempts == 1

    first = await exam_access_service.authorize_new_attempt(
        db_session,
        user_id=student.id,
        exam_type=ExamType.VERB_EXAM,
        actor_id=actor_id,
    )
    assert first.allowed_attempts == 2

    second = await exam_access_service.authorize_new_attempt(
        db_session,
        user_id=student.id,
        exam_type=ExamType.PAST_SIMPLE_EXAM,
        actor_id=actor_id,
    )
    # Past Simple starts at 1, then +1 => 2
    assert second.allowed_attempts == 2

    third = await exam_access_service.authorize_new_attempt(
        db_session,
        user_id=student.id,
        exam_type=ExamType.PAST_SIMPLE_EXAM,
        actor_id=actor_id,
    )
    assert third.allowed_attempts == 3

    fourth = await exam_access_service.authorize_new_attempt(
        db_session,
        user_id=student.id,
        exam_type=ExamType.VERB_EXAM,
        actor_id=actor_id,
    )
    assert fourth.allowed_attempts == 3
