import secrets
from collections.abc import Sequence

from app.models.enums import PromptType

PROMPT_TYPES = [PromptType.FROM_SPANISH, PromptType.FROM_BASE, PromptType.FROM_PAST]


def build_balanced_prompt_types(count: int = 20) -> list[PromptType]:
    """Distribución 7/7/6 con el grupo de 6 elegido al azar."""
    if count != 20:
        raise ValueError("El MVP requiere exactamente 20 preguntas.")
    rng = secrets.SystemRandom()
    short_type = rng.choice(PROMPT_TYPES)
    types: list[PromptType] = []
    for pt in PROMPT_TYPES:
        types.extend([pt] * (6 if pt == short_type else 7))
    rng.shuffle(types)
    return types


def sample_verb_ids(verb_ids: Sequence, count: int = 20) -> list:
    if len(verb_ids) < count:
        raise ValueError("No hay suficientes verbos activos.")
    return secrets.SystemRandom().sample(list(verb_ids), count)


def fields_for_prompt(prompt_type: PromptType) -> tuple[str, str]:
    if prompt_type == PromptType.FROM_SPANISH:
        return ("BASE", "PAST")
    if prompt_type == PromptType.FROM_BASE:
        return ("SPANISH", "PAST")
    return ("BASE", "SPANISH")


def shown_field_for_prompt(prompt_type: PromptType) -> str:
    if prompt_type == PromptType.FROM_SPANISH:
        return "SPANISH"
    if prompt_type == PromptType.FROM_BASE:
        return "BASE"
    return "PAST"


PROMPT_LABELS = {
    PromptType.FROM_SPANISH: "español",
    PromptType.FROM_BASE: "forma base en inglés",
    PromptType.FROM_PAST: "pasado en inglés",
}

FIELD_LABELS = {
    "BASE": "forma base en inglés",
    "PAST": "pasado en inglés",
    "SPANISH": "significado en español",
}
