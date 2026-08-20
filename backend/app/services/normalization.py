import re
import unicodedata

# Comilla tipográfica, acento agudo del teclado ES (´), backtick, etc.
_APOSTROPHE_VARIANTS = (
    "’",  # RIGHT SINGLE QUOTATION MARK
    "‘",  # LEFT SINGLE QUOTATION MARK
    "‛",  # SINGLE HIGH-REVERSED-9 QUOTATION MARK
    "′",  # PRIME
    "´",  # ACUTE ACCENT (común en teclados latinos)
    "`",  # GRAVE ACCENT / backtick
    "ʼ",  # MODIFIER LETTER APOSTROPHE
    "＇",  # FULLWIDTH APOSTROPHE
)

_SPECIAL_CONTRACTIONS = (
    (re.compile(r"\bwon't\b"), "will not"),
    (re.compile(r"\bcan't\b"), "cannot"),
)

# didn't → did not, wasn't → was not, weren't → were not, etc.
_NT_CONTRACTION = re.compile(r"\b([a-z]+)n't\b")

# Contenido entre paréntesis (pistas pedagógicas, no respuestas solas).
_PAREN_CONTENT = re.compile(r"\([^)]*\)")
# Separadores de sinónimos: coma, barra, "o"/"u" como conjunción.
_SPANISH_ALT_SPLIT = re.compile(r"\s*(?:,|/|\bo\b|\bu\b)\s*")


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


def expand_spanish_alternatives(value: str) -> set[str]:
    """Extrae variantes naturales de un significado en español.

    Ejemplos:
    - «Decir o contar (a alguien)» → decir, contar, decir o contar
    - «Intentar, tratar» → intentar, tratar
    - «Salir o dejar» → salir, dejar
    El texto entre paréntesis no se acepta como respuesta aislada.
    """
    normalized = normalize_spanish(value)
    if not normalized:
        return set()

    alternatives = {normalized}
    without_parens = " ".join(_PAREN_CONTENT.sub(" ", normalized).split())
    if without_parens:
        alternatives.add(without_parens)

    for source in (normalized, without_parens):
        if not source:
            continue
        for part in _SPANISH_ALT_SPLIT.split(source):
            token = part.strip(" .;")
            # Evita basura corta; exige al menos 2 caracteres.
            if len(token) >= 2:
                alternatives.add(token)
    return alternatives


def spanish_answer_matches(raw: str | None, valid: list[str] | None) -> bool:
    """Acepta sinónimos o formulaciones equivalentes del significado en español."""
    if raw is None or not str(raw).strip() or not valid:
        return False
    accepted: set[str] = set()
    for entry in valid:
        if entry is None or not str(entry).strip():
            continue
        accepted |= expand_spanish_alternatives(str(entry))
    if not accepted:
        return False
    student = normalize_spanish(raw)
    if student in accepted:
        return True
    return bool(expand_spanish_alternatives(raw) & accepted)


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


def _unify_apostrophes(value: str) -> str:
    for char in _APOSTROPHE_VARIANTS:
        value = value.replace(char, "'")
    return value


def _expand_english_contractions(value: str) -> str:
    """Expande contracciones para equivaler didn't ↔ did not (y similares)."""
    for pattern, replacement in _SPECIAL_CONTRACTIONS:
        value = pattern.sub(replacement, value)
    value = _NT_CONTRACTION.sub(r"\1 not", value)
    # Unificar "can not" con "cannot" tras expandir can't.
    value = re.sub(r"\bcan not\b", "cannot", value)
    return value


def normalize_english_answer(value: str) -> str:
    """Normaliza respuestas escritas sin relajar la estructura gramatical.

    Ignora mayúsculas, espacios extra, puntuación y variantes de comilla
    (incluida ´). Equivalencia didn't / did not (y otras contracciones n't).
    """
    normalized = _unify_apostrophes(value)
    normalized = normalize_text(normalized)
    normalized = _expand_english_contractions(normalized)
    normalized = normalized.translate(_ENGLISH_PUNCTUATION)
    return " ".join(normalized.split())
