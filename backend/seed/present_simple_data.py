"""Banco inicial de preguntas para el examen Present Simple."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PresentSimpleQuestionSeed:
    stable_key: str
    topic: str
    question_type: str
    instruction: str
    question: str
    options: list[str] | None
    correct_answer: str
    accepted_answers: list[str]
    explanation: str
    points: int = 1
    active: bool = True


PRESENT_SIMPLE_QUESTIONS: list[PresentSimpleQuestionSeed] = [
    # Afirmativas
    PresentSimpleQuestionSeed(
        stable_key="present_simple_affirmative_01",
        topic="affirmative",
        question_type="multiple_choice",
        instruction="Choose the correct sentence.",
        question="Which sentence is correct in the Present Simple?",
        options=[
            "She play tennis every Saturday.",
            "She plays tennis every Saturday.",
            "She playing tennis every Saturday.",
            "She do play tennis every Saturday.",
        ],
        correct_answer="She plays tennis every Saturday.",
        accepted_answers=[],
        explanation=(
            "With he, she, and it, add -s to the verb in affirmative Present Simple: plays."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_affirmative_02",
        topic="affirmative",
        question_type="fill_blank",
        instruction="Complete the sentence with the correct Present Simple form.",
        question="My brother ___ to school by bus. (go)",
        options=None,
        correct_answer="goes",
        accepted_answers=[],
        explanation=(
            "Go becomes goes with he/she/it. Remember: go → goes (add -es after o)."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_affirmative_03",
        topic="affirmative",
        question_type="fill_blank",
        instruction="Complete the sentence with the correct Present Simple form.",
        question="We ___ English every day. (study)",
        options=None,
        correct_answer="study",
        accepted_answers=[],
        explanation=(
            "With I, you, we, and they, use the base form of the verb: study (no -s)."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_affirmative_04",
        topic="affirmative",
        question_type="multiple_choice",
        instruction="Choose the correct verb form.",
        question="Tom ___ breakfast at 7:00 every morning.",
        options=["eat", "eats", "eating", "do eat"],
        correct_answer="eats",
        accepted_answers=[],
        explanation="Tom is he, so the Present Simple verb needs -s: eats.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_affirmative_05",
        topic="affirmative",
        question_type="transform_sentence",
        instruction="Write the sentence in the Present Simple affirmative.",
        question="(she / watch) TV after dinner.",
        options=None,
        correct_answer="She watches TV after dinner.",
        accepted_answers=["She watches TV after dinner"],
        explanation=(
            "With she, watch becomes watches (add -es after ch). Capitalize the first word."
        ),
    ),
    # Negativas
    PresentSimpleQuestionSeed(
        stable_key="present_simple_negative_01",
        topic="negative",
        question_type="multiple_choice",
        instruction="Choose the correct negative sentence.",
        question="Which sentence is correct?",
        options=[
            "She doesn't likes coffee.",
            "She don't like coffee.",
            "She doesn't like coffee.",
            "She not like coffee.",
        ],
        correct_answer="She doesn't like coffee.",
        accepted_answers=[],
        explanation=(
            "Use doesn't with he/she/it, then the base verb like (no -s after doesn't)."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_negative_02",
        topic="negative",
        question_type="fill_blank",
        instruction="Complete the sentence with don't or doesn't.",
        question="They ___ live in this city.",
        options=None,
        correct_answer="don't",
        accepted_answers=["do not"],
        explanation="Use don't (do not) with I, you, we, and they.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_negative_03",
        topic="negative",
        question_type="fill_blank",
        instruction="Complete the sentence with don't or doesn't.",
        question="My sister ___ speak French.",
        options=None,
        correct_answer="doesn't",
        accepted_answers=["does not"],
        explanation="My sister is she, so use doesn't (does not) + base verb.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_negative_04",
        topic="negative",
        question_type="transform_sentence",
        instruction="Change the sentence into the Present Simple negative.",
        question="He works on Sundays.",
        options=None,
        correct_answer="He doesn't work on Sundays.",
        accepted_answers=[
            "He does not work on Sundays.",
            "He doesn't work on Sundays",
        ],
        explanation=(
            "Use doesn't + base verb work. Do not keep the -s on the main verb."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_negative_05",
        topic="negative",
        question_type="multiple_choice",
        instruction="Choose the correct sentence.",
        question="Which negative sentence is correct?",
        options=[
            "I doesn't eat meat.",
            "I don't eat meat.",
            "I not eat meat.",
            "I don't eats meat.",
        ],
        correct_answer="I don't eat meat.",
        accepted_answers=[],
        explanation="With I, use don't + base verb. Never use doesn't with I.",
    ),
    # Interrogativas
    PresentSimpleQuestionSeed(
        stable_key="present_simple_interrogative_01",
        topic="interrogative",
        question_type="multiple_choice",
        instruction="Choose the correct question.",
        question="Which sentence has the correct Present Simple interrogative structure?",
        options=[
            "You do live here?",
            "Do you live here?",
            "Does you live here?",
            "Live you here?",
        ],
        correct_answer="Do you live here?",
        accepted_answers=[],
        explanation="Present Simple questions use: Do/Does + subject + base verb.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_interrogative_02",
        topic="interrogative",
        question_type="multiple_choice",
        instruction="Choose the correct question.",
        question="Which question is correct?",
        options=[
            "Does she plays the piano?",
            "Do she play the piano?",
            "Does she play the piano?",
            "She does play the piano?",
        ],
        correct_answer="Does she play the piano?",
        accepted_answers=[],
        explanation=(
            "Use does with she, then the base verb play (no -s after does)."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_interrogative_03",
        topic="interrogative",
        question_type="fill_blank",
        instruction="Complete the question with Do or Does.",
        question="___ your parents work in the hospital?",
        options=None,
        correct_answer="Do",
        accepted_answers=["do"],
        explanation="Your parents is they, so use Do before the subject.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_interrogative_04",
        topic="interrogative",
        question_type="transform_sentence",
        instruction="Change the sentence into a Present Simple question.",
        question="Maria studies math at night.",
        options=None,
        correct_answer="Does Maria study math at night?",
        accepted_answers=["Does Maria study maths at night?"],
        explanation=(
            "Use Does + subject + base verb study. Change studies to study."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_interrogative_05",
        topic="interrogative",
        question_type="fill_blank",
        instruction="Complete the question with Do or Does.",
        question="___ he like spicy food?",
        options=None,
        correct_answer="Does",
        accepted_answers=["does"],
        explanation="Use Does with he, she, and it.",
    ),
    # Respuestas cortas
    PresentSimpleQuestionSeed(
        stable_key="present_simple_short_answers_01",
        topic="short_answers",
        question_type="multiple_choice",
        instruction="Choose the correct short answer.",
        question="Does she play tennis?",
        options=[
            "Yes, she does.",
            "Yes, she plays.",
            "Yes, she do.",
            "Yes, she is.",
        ],
        correct_answer="Yes, she does.",
        accepted_answers=[],
        explanation=(
            "An affirmative short answer uses yes + subject pronoun + do/does."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_short_answers_02",
        topic="short_answers",
        question_type="multiple_choice",
        instruction="Choose the correct short answer.",
        question="Do they live near the school?",
        options=[
            "No, they doesn't.",
            "No, they don't.",
            "No, they aren't.",
            "No, they not.",
        ],
        correct_answer="No, they don't.",
        accepted_answers=[],
        explanation="A negative short answer for they uses don't.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_short_answers_03",
        topic="short_answers",
        question_type="short_answer",
        instruction="Write a negative short answer.",
        question="Does Ana speak German?",
        options=None,
        correct_answer="No, she doesn't.",
        accepted_answers=["No, she does not.", "No she doesn't."],
        explanation="Use she for Ana and doesn't (or does not) in a negative short answer.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_short_answers_04",
        topic="short_answers",
        question_type="short_answer",
        instruction="Write an affirmative short answer.",
        question="Do you like chocolate?",
        options=None,
        correct_answer="Yes, I do.",
        accepted_answers=["Yes I do.", "Yes, I do"],
        explanation="With you, the short answer uses I: Yes, I do.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_short_answers_05",
        topic="short_answers",
        question_type="multiple_choice",
        instruction="Choose the correct short answer.",
        question="Does your brother cook dinner?",
        options=[
            "Yes, he do.",
            "Yes, he does.",
            "Yes, he cooks.",
            "Yes, he is.",
        ],
        correct_answer="Yes, he does.",
        accepted_answers=[],
        explanation="Your brother is he, so the affirmative short answer is Yes, he does.",
    ),
    # Identificar
    PresentSimpleQuestionSeed(
        stable_key="present_simple_identify_01",
        topic="identify",
        question_type="identify",
        instruction="Identify the correct Present Simple sentence.",
        question="Which sentence is correct?",
        options=[
            "He go to the gym on Mondays.",
            "He goes to the gym on Mondays.",
            "He going to the gym on Mondays.",
            "He does goes to the gym on Mondays.",
        ],
        correct_answer="He goes to the gym on Mondays.",
        accepted_answers=[],
        explanation="With he, the affirmative verb needs -s/-es: goes.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_identify_02",
        topic="identify",
        question_type="multiple_choice",
        instruction="Identify the correct negative sentence.",
        question="Which sentence is correct?",
        options=[
            "She don't works here.",
            "She doesn't works here.",
            "She doesn't work here.",
            "She not works here.",
        ],
        correct_answer="She doesn't work here.",
        accepted_answers=[],
        explanation="After doesn't, use the base form work without -s.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_identify_03",
        topic="identify",
        question_type="identify",
        instruction="Identify the correct question.",
        question="Which question is correct?",
        options=[
            "Does they watch movies on Friday?",
            "Do they watches movies on Friday?",
            "Do they watch movies on Friday?",
            "They do watch movies on Friday?",
        ],
        correct_answer="Do they watch movies on Friday?",
        accepted_answers=[],
        explanation="Use Do with they + base verb watch.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_identify_04",
        topic="identify",
        question_type="identify",
        instruction="Identify the sentence with the correct third-person -s.",
        question="Which sentence uses the third person correctly?",
        options=[
            "My dad teach math.",
            "My dad teaches math.",
            "My dad teaching math.",
            "My dad do teach math.",
        ],
        correct_answer="My dad teaches math.",
        accepted_answers=[],
        explanation=(
            "Teach ends in -ch, so add -es for he/she/it: teaches."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_identify_05",
        topic="identify",
        question_type="multiple_choice",
        instruction="Identify the correct short answer.",
        question="Does it rain a lot in April?",
        options=[
            "Yes, it do.",
            "Yes, it rains.",
            "Yes, it does.",
            "Yes, it is.",
        ],
        correct_answer="Yes, it does.",
        accepted_answers=[],
        explanation="For it, the affirmative short answer is Yes, it does.",
    ),
    # Ordenar palabras
    PresentSimpleQuestionSeed(
        stable_key="present_simple_order_words_01",
        topic="order_words",
        question_type="order_words",
        instruction="Order the words to make a question.",
        question="she / does / play / tennis",
        options=None,
        correct_answer="Does she play tennis?",
        accepted_answers=[],
        explanation="Place does before the subject, then use the base verb play.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_order_words_02",
        topic="order_words",
        question_type="order_words",
        instruction="Order the words to make an affirmative sentence.",
        question="every morning / breakfast / eats / he",
        options=None,
        correct_answer="He eats breakfast every morning.",
        accepted_answers=[],
        explanation=(
            "Subject + verb with -s + object + time expression: He eats breakfast every morning."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_order_words_03",
        topic="order_words",
        question_type="order_words",
        instruction="Order the words to make a negative sentence.",
        question="like / don't / spicy food / they",
        options=None,
        correct_answer="They don't like spicy food.",
        accepted_answers=["They do not like spicy food."],
        explanation="Subject + don't + base verb + object.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_order_words_04",
        topic="order_words",
        question_type="order_words",
        instruction="Order the words to make a question.",
        question="do / your friends / to school / walk",
        options=None,
        correct_answer="Do your friends walk to school?",
        accepted_answers=[],
        explanation="Use Do + plural subject + base verb.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_order_words_05",
        topic="order_words",
        question_type="order_words",
        instruction="Order the words to make an affirmative sentence.",
        question="watches / after dinner / TV / Laura",
        options=None,
        correct_answer="Laura watches TV after dinner.",
        accepted_answers=[],
        explanation="Laura is she, so use watches (third person -es).",
    ),
    # Oraciones
    PresentSimpleQuestionSeed(
        stable_key="present_simple_sentences_01",
        topic="sentences",
        question_type="transform_sentence",
        instruction="Rewrite the sentence in the Present Simple affirmative with the correct verb form.",
        question="(My cousins / visit) us on weekends.",
        options=None,
        correct_answer="My cousins visit us on weekends.",
        accepted_answers=["My cousins visit us on weekends"],
        explanation="Cousins is they, so use the base form visit (no -s).",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_sentences_02",
        topic="sentences",
        question_type="transform_sentence",
        instruction="Change the affirmative sentence into a negative sentence.",
        question="We finish homework before dinner.",
        options=None,
        correct_answer="We don't finish homework before dinner.",
        accepted_answers=[
            "We do not finish homework before dinner.",
            "We don't finish homework before dinner",
        ],
        explanation="Use don't + base verb finish with we.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_sentences_03",
        topic="sentences",
        question_type="transform_sentence",
        instruction="Change the sentence into a Present Simple question.",
        question="The dog sleeps on the sofa.",
        options=None,
        correct_answer="Does the dog sleep on the sofa?",
        accepted_answers=[],
        explanation=(
            "The dog is it, so use Does + subject + base verb sleep."
        ),
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_sentences_04",
        topic="sentences",
        question_type="fill_blank",
        instruction="Complete the sentence with the correct Present Simple form of the verb in parentheses.",
        question="Carla ___ her room every Saturday. (clean)",
        options=None,
        correct_answer="cleans",
        accepted_answers=[],
        explanation="Carla is she, so clean becomes cleans.",
    ),
    PresentSimpleQuestionSeed(
        stable_key="present_simple_sentences_05",
        topic="sentences",
        question_type="multiple_choice",
        instruction="Choose the sentence that correctly uses the Present Simple.",
        question="Which sentence is correct?",
        options=[
            "Does Peter likes pizza?",
            "Peter like pizza.",
            "Peter likes pizza.",
            "Peter liking pizza.",
        ],
        correct_answer="Peter likes pizza.",
        accepted_answers=[],
        explanation=(
            "Affirmative with he uses likes. In questions, use Does + like (base form)."
        ),
    ),
]
