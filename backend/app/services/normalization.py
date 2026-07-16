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
