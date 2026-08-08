import uuid
from collections import Counter

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password
from app.models import (
    ExamAccess,
    ExamType,
    PastSimpleAttempt,
    PastSimpleConfig,
    User,
    UserRole,
)


async def _student(db_session: AsyncSession, username: str) -> User:
    user = User(
        id=uuid.uuid4(),
        username=username,
        username_normalized=username.casefold(),
        full_name=username,
        password_hash=hash_password("temporary123"),
        role=UserRole.STUDENT,
        is_active=True,
        must_change_password=False,
    )
    db_session.add(user)
    db_session.add(
        ExamAccess(
            id=uuid.uuid4(),
            user_id=user.id,
            exam_type=ExamType.PAST_SIMPLE_EXAM.value,
            is_enabled=True,
            practice_enabled=True,
            allowed_attempts=1,
            practice_allowed_attempts=1,
        )
    )
    await db_session.commit()
    return user


def _auth(user: User) -> dict[str, str]:
    token = create_access_token(user_id=str(user.id), role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.integration
@pytest.mark.asyncio
async def test_past_simple_attempt_is_balanced_owned_and_idempotent(
    client,
    db_session: AsyncSession,
):
    suffix = uuid.uuid4().hex[:8]
    student = await _student(db_session, f"past_student_{suffix}")
    other = await _student(db_session, f"past_other_{suffix}")
    config = (
        await db_session.execute(select(PastSimpleConfig).limit(1))
    ).scalar_one()
    config.is_enabled = True
    await db_session.commit()

    started = await client.post(
        "/api/v1/past-simple/attempts",
        headers=_auth(student),
    )
    assert started.status_code == 200
    payload = started.json()
    assert len(payload["questions"]) == 24
    assert set(Counter(q["topic"] for q in payload["questions"]).values()) == {2}
    attempt_id = payload["id"]

    forbidden = await client.get(
        f"/api/v1/past-simple/attempts/{attempt_id}",
        headers=_auth(other),
    )
    assert forbidden.status_code == 404

    attempt = (
        await db_session.execute(
            select(PastSimpleAttempt)
            .options(selectinload(PastSimpleAttempt.questions))
            .where(PastSimpleAttempt.id == uuid.UUID(attempt_id))
        )
    ).scalar_one()
    first = sorted(attempt.questions, key=lambda item: item.position)[0]
    saved = await client.patch(
        f"/api/v1/past-simple/attempts/{attempt_id}/questions/{first.id}",
        headers=_auth(student),
        json={"answer": first.snapshot_correct_answer},
    )
    assert saved.status_code == 200

    submitted = await client.post(
        f"/api/v1/past-simple/attempts/{attempt_id}/submit",
        headers=_auth(student),
    )
    assert submitted.status_code == 200
    submitted_again = await client.post(
        f"/api/v1/past-simple/attempts/{attempt_id}/submit",
        headers=_auth(student),
    )
    assert submitted_again.status_code == 200

    result = await client.get(
        f"/api/v1/past-simple/attempts/{attempt_id}/result",
        headers=_auth(student),
    )
    assert result.status_code == 200
    result_data = result.json()
    assert result_data["correct_answers"] == 1
    assert result_data["unanswered_answers"] == 23
    assert len(result_data["topic_performance"]) == 12

    await db_session.refresh(attempt)
    attempt.config_snapshot = {
        **attempt.config_snapshot,
        "review_policy": "SCORE_ONLY",
    }
    await db_session.commit()
    score_only_attempt = await client.get(
        f"/api/v1/past-simple/attempts/{attempt_id}",
        headers=_auth(student),
    )
    assert score_only_attempt.status_code == 200
    assert all(
        "correct_answer" not in question
        for question in score_only_attempt.json()["questions"]
    )

    no_retry = await client.post(
        "/api/v1/past-simple/attempts",
        headers=_auth(student),
    )
    assert no_retry.status_code == 403
    assert no_retry.json()["code"] == "MAX_ATTEMPTS_REACHED"

    config.practice_enabled = True
    await db_session.commit()
    practice = await client.post(
        "/api/v1/past-simple/practice/sessions",
        headers=_auth(student),
    )
    assert practice.status_code == 200
    practice_payload = practice.json()
    assert practice_payload["mode"] == "practice"
    assert len(practice_payload["questions"]) == 24
    practice_id = practice_payload["id"]
    practice_question_id = practice_payload["questions"][0]["id"]

    checked = await client.post(
        f"/api/v1/past-simple/practice/sessions/{practice_id}"
        f"/questions/{practice_question_id}/check",
        headers=_auth(student),
        json={"answer": "wrong answer"},
    )
    assert checked.status_code == 200
    checked_data = checked.json()
    assert checked_data["status"] in {"correct", "incorrect", "unanswered"}
    assert "correct_answer" in checked_data
    assert "explanation" in checked_data

    finished = await client.post(
        f"/api/v1/past-simple/practice/sessions/{practice_id}/submit",
        headers=_auth(student),
    )
    assert finished.status_code == 200
    assert finished.json()["mode"] == "practice"

    # Practice has its own attempt limit and does not consume exam attempts.
    blocked_practice = await client.post(
        "/api/v1/past-simple/practice/sessions",
        headers=_auth(student),
    )
    assert blocked_practice.status_code == 403
    assert blocked_practice.json()["code"] == "MAX_PRACTICE_ATTEMPTS_REACHED"

    access = (
        await db_session.execute(
            select(ExamAccess).where(
                ExamAccess.user_id == student.id,
                ExamAccess.exam_type == ExamType.PAST_SIMPLE_EXAM.value,
            )
        )
    ).scalar_one()
    access.practice_allowed_attempts = 2
    await db_session.commit()

    another_practice = await client.post(
        "/api/v1/past-simple/practice/sessions",
        headers=_auth(student),
    )
    assert another_practice.status_code == 200
    still_blocked = await client.post(
        "/api/v1/past-simple/attempts",
        headers=_auth(student),
    )
    assert still_blocked.status_code == 403
