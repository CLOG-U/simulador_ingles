from seed.verbs_data import VERBS


def test_verb_bank_has_73_entries() -> None:
    assert len(VERBS) == 73


def test_source_orders_are_unique_and_complete() -> None:
    orders = [v.source_order for v in VERBS]
    assert len(orders) == len(set(orders))
    assert sorted(orders) == list(range(1, 74))


def test_disambiguated_verbs_have_distinct_prompts() -> None:
    by_spanish = {}
    for verb in VERBS:
        key = verb.spanish_display.lower()
        by_spanish.setdefault(key, set()).add(verb.spanish_prompt)
    do_prompts = {v.spanish_prompt for v in VERBS if v.base_display == "Do"}
    make_prompts = {v.spanish_prompt for v in VERBS if v.base_display == "Make"}
    assert "Hacer (una actividad o tarea)" in do_prompts
    assert "Hacer (crear o fabricar)" in make_prompts
