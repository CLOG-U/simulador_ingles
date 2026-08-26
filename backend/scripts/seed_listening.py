"""Carga idempotente del banco y configuración de Listening Practice."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import database_connect_args, settings
from app.models import ListeningConfig, ListeningQuestion, ReviewPolicy
from seed.listening_data import LISTENING_QUESTIONS


async def seed_listening(session: AsyncSession) -> None:
    for item in LISTENING_QUESTIONS:
        result = await session.execute(
            select(ListeningQuestion).where(ListeningQuestion.stable_key == item.stable_key)
        )
        question = result.scalar_one_or_none()
        values = {
            "exam_type": "listening_practice",
            "topic": item.topic,
            "question_type": item.question_type,
            "instruction": item.instruction,
            "question": item.question,
            "options": item.options,
            "correct_answer": item.correct_answer,
            "accepted_answers": item.accepted_answers,
            "explanation": item.explanation,
            "points": item.points,
            "audio_url": item.audio_url,
            "clip_key": item.clip_key,
            "clip_title": item.clip_title,
        }
        if question is None:
            session.add(
                ListeningQuestion(
                    id=uuid.uuid4(),
                    stable_key=item.stable_key,
                    active=item.active,
                    **values,
                )
            )
        else:
            for key, value in values.items():
                setattr(question, key, value)

    result = await session.execute(select(ListeningConfig).limit(1))
    config = result.scalar_one_or_none()
    if config is None:
        session.add(
            ListeningConfig(
                id=uuid.uuid4(),
                is_enabled=False,
                practice_enabled=True,
                question_count=10,
                passing_percentage=70,
                duration_minutes=None,
                review_policy=ReviewPolicy.FULL,
            )
        )
    else:
        config.question_count = 10
        if not config.practice_enabled:
            config.practice_enabled = True


async def run_seed() -> None:
    engine = create_async_engine(
        settings.database_url_async,
        connect_args=database_connect_args(),
    )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        async with session.begin():
            await seed_listening(session)
    await engine.dispose()
    print(f"Seed Listening Practice completado: {len(LISTENING_QUESTIONS)} preguntas.")


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
