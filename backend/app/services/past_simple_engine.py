import secrets
from collections import defaultdict
from random import Random

from app.models import PastSimpleQuestion, PastSimpleTopic


def shuffle_order_words(prompt: str, rng: Random | None = None) -> str:
    """Mezcla los bloques de una pregunta de ordenar y evita el orden original."""
    parts = [part.strip() for part in prompt.split("/") if part.strip()]
    if len(parts) < 2:
        return prompt

    original = parts.copy()
    randomizer = rng or secrets.SystemRandom()
    randomizer.shuffle(parts)
    if parts == original:
        swap_index = next(
            (index for index in range(1, len(parts)) if parts[index] != parts[0]),
            None,
        )
        if swap_index is None:
            return prompt
        parts[0], parts[swap_index] = parts[swap_index], parts[0]
    return " / ".join(parts)


def select_balanced_questions(
    questions: list[PastSimpleQuestion],
) -> list[PastSimpleQuestion]:
    grouped: dict[str, list[PastSimpleQuestion]] = defaultdict(list)
    for question in questions:
        if question.active:
            grouped[question.topic].append(question)

    rng = secrets.SystemRandom()
    selected: list[PastSimpleQuestion] = []
    for topic in PastSimpleTopic:
        candidates = grouped.get(topic.value, [])
        if len(candidates) < 2:
            raise ValueError(
                f"El tema '{topic.value}' necesita al menos dos preguntas activas."
            )
        selected.extend(rng.sample(candidates, 2))

    rng.shuffle(selected)
    return selected
