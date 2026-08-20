import secrets
from collections import defaultdict
from random import Random

from app.models import PresentSimpleQuestion, PresentSimpleTopic
from app.services.normalization import normalize_english_answer


def _parts_match_answer(parts: list[str], correct_answer: str | None) -> bool:
    if not correct_answer:
        return False
    return normalize_english_answer(" ".join(parts)) == normalize_english_answer(
        correct_answer
    )


def shuffle_order_words(
    prompt: str,
    rng: Random | None = None,
    *,
    correct_answer: str | None = None,
) -> str:
    """Mezcla los bloques y evita el orden original o el de la respuesta correcta."""
    parts = [part.strip() for part in prompt.split("/") if part.strip()]
    if len(parts) < 2:
        return prompt

    original = parts.copy()
    randomizer = rng or secrets.SystemRandom()

    def is_invalid(candidate: list[str]) -> bool:
        return candidate == original or _parts_match_answer(candidate, correct_answer)

    for _ in range(24):
        candidate = parts.copy()
        randomizer.shuffle(candidate)
        if not is_invalid(candidate):
            return " / ".join(candidate)

    # Si el azar no alcanza, fuerza un intercambio distinto del orden prohibido.
    for index in range(1, len(parts)):
        candidate = original.copy()
        candidate[0], candidate[index] = candidate[index], candidate[0]
        if not is_invalid(candidate):
            return " / ".join(candidate)

    return " / ".join(original[1:] + original[:1])


def select_balanced_questions(
    questions: list[PresentSimpleQuestion],
) -> list[PresentSimpleQuestion]:
    grouped: dict[str, list[PresentSimpleQuestion]] = defaultdict(list)
    for question in questions:
        if question.active:
            grouped[question.topic].append(question)

    rng = secrets.SystemRandom()
    selected: list[PresentSimpleQuestion] = []
    for topic in PresentSimpleTopic:
        candidates = grouped.get(topic.value, [])
        if len(candidates) < 2:
            raise ValueError(
                f"El tema '{topic.value}' necesita al menos dos preguntas activas."
            )
        selected.extend(rng.sample(candidates, 2))

    rng.shuffle(selected)
    return selected
