"""Carga idempotente del banco y configuración de Present Perfect Exam."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import database_connect_args, settings
from app.models import PresentPerfectConfig, PresentPerfectQuestion, ReviewPolicy
from seed.present_perfect_data import PRESENT_PERFECT_QUESTIONS


async def seed_present_perfect(session: AsyncSession) -> None:
    for item in PRESENT_PERFECT_QUESTIONS:
        result = await session.execute(
            select(PresentPerfectQuestion).where(
                PresentPerfectQuestion.stable_key == item.stable_key
            )
        )
        question = result.scalar_one_or_none()
        values = {
            "exam_type": "present_perfect_exam",
            "topic": item.topic,
            "question_type": item.question_type,
            "instruction": item.instruction,
            "question": item.question,
            "options": item.options,
            "correct_answer": item.correct_answer,
            "accepted_answers": item.accepted_answers,
            "explanation": item.explanation,
            "points": item.points,
        }
        if question is None:
            session.add(
                PresentPerfectQuestion(
                    id=uuid.uuid4(),
                    stable_key=item.stable_key,
                    active=item.active,
                    **values,
                )
            )
        else:
            for key, value in values.items():
                setattr(question, key, value)

    result = await session.execute(select(PresentPerfectConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        session.add(
            PresentPerfectConfig(
                id=uuid.uuid4(),
                is_enabled=False,
                practice_enabled=True,
                question_count=20,
                passing_percentage=70,
                duration_minutes=None,
                review_policy=ReviewPolicy.FULL,
            )
        )
    else:
        config.question_count = 20


async def run_seed() -> None:
    engine = create_async_engine(
        settings.database_url_async,
        connect_args=database_connect_args(),
    )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        async with session.begin():
            await seed_present_perfect(session)
    await engine.dispose()
    print(
        f"Seed Present Perfect completado: {len(PRESENT_PERFECT_QUESTIONS)} preguntas."
    )


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
