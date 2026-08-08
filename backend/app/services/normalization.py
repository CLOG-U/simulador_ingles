import unicodedata


def normalize_text(value: str) -> str:
    """Normaliza texto para comparación: trim, espacios, minúsculas, Unicode NFC."""
    collapsed = " ".join(value.strip().split())
    return unicodedata.normalize("NFC", collapsed.casefold())


def normalize_spanish(value: str) -> str:
    """Normaliza español removiendo tildes para comparación."""
    normalized = normalize_text(value)
    return "".join(
        c for c in unicodedata.normalize("NFD", normalized) if unicodedata.category(c) != "Mn"
    )


_ENGLISH_PUNCTUATION = str.maketrans(
    "",
    "",
    # Incluye punto final, signos de pregunta/exclamación y variantes tipográficas.
    ".,?!;:"
    "¿¡"
    "\"“”„‟"
    "…‥"
    "·•"
    "()[]{}"
)


def normalize_english_answer(value: str) -> str:
    """Normaliza respuestas escritas sin relajar la estructura gramatical.

    Ignora mayúsculas, espacios extra y puntuación (incluido el punto o
    signo de interrogación final), para que "Did she go?" y "Did she go"
    cuenten igual.
    """
    normalized = (
        value.replace("’", "'")
        .replace("‘", "'")
        .replace("‛", "'")
        .replace("′", "'")
    )
    normalized = normalize_text(normalized)
    normalized = normalized.translate(_ENGLISH_PUNCTUATION)
    return " ".join(normalized.split())
