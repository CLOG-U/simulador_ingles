"""Carga idempotente del banco de verbos y configuración inicial."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import ExamConfig, ReviewPolicy, Verb, VerbAnswer, VerbAnswerField
from app.services.normalization import normalize_spanish, normalize_text
from seed.verbs_data import VERBS


async def seed_verbs(session: AsyncSession) -> None:
    for item in VERBS:
        result = await session.execute(select(Verb).where(Verb.source_order == item.source_order))
        verb = result.scalar_one_or_none()

        if verb is None:
            verb = Verb(
                id=uuid.uuid4(),
                source_order=item.source_order,
                base_display=item.base_display,
                past_display=item.past_display,
                spanish_display=item.spanish_display,
                spanish_prompt=item.spanish_prompt,
                hint=item.hint,
                is_active=True,
            )
            session.add(verb)
            await session.flush()
        else:
            verb.base_display = item.base_display
            verb.past_display = item.past_display
            verb.spanish_display = item.spanish_display
            verb.spanish_prompt = item.spanish_prompt
            verb.hint = item.hint

        await _upsert_answer(
            session, verb.id, VerbAnswerField.BASE, item.base_display, normalize_text
        )
        await _upsert_answer(
            session, verb.id, VerbAnswerField.PAST, item.past_display, normalize_text
        )
        await _upsert_answer(
            session, verb.id, VerbAnswerField.SPANISH, item.spanish_prompt, normalize_spanish
        )


async def _upsert_answer(
    session: AsyncSession,
    verb_id: uuid.UUID,
    field: VerbAnswerField,
    display: str,
    normalizer,
) -> None:
    normalized = normalizer(display)
    result = await session.execute(
        select(VerbAnswer).where(
            VerbAnswer.verb_id == verb_id,
            VerbAnswer.field == field,
            VerbAnswer.normalized_value == normalized,
        )
    )
    answer = result.scalar_one_or_none()
    if answer is None:
        session.add(
            VerbAnswer(
                id=uuid.uuid4(),
                verb_id=verb_id,
                field=field,
                display_value=display,
                normalized_value=normalized,
            )
        )
    else:
        answer.display_value = display


async def seed_exam_config(session: AsyncSession) -> None:
    result = await session.execute(select(ExamConfig))
    config = result.scalar_one_or_none()
    if config is None:
        session.add(
            ExamConfig(
                id=uuid.uuid4(),
                question_count=20,
                passing_percentage=70,
                duration_minutes=None,
                max_attempts=1,
                review_policy=ReviewPolicy.FULL,
            )
        )


async def run_seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        async with session.begin():
            await seed_verbs(session)
            await seed_exam_config(session)

    await engine.dispose()
    print(f"Seed completado: {len(VERBS)} verbos y configuración de examen.")


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
