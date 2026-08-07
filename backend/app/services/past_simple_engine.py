import secrets
from collections import defaultdict

from app.models import PastSimpleQuestion, PastSimpleTopic


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
