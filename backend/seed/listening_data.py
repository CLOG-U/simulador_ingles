"""Banco inicial de Listening Practice: clip Leo in Manta."""

from dataclasses import dataclass

LEO_MANTA_AUDIO_URL = "/audio/leo-manta.mp3"
LEO_MANTA_CLIP_KEY = "leo-manta"
LEO_MANTA_CLIP_TITLE = "Leo in Manta"


@dataclass(frozen=True)
class ListeningQuestionSeed:
    stable_key: str
    topic: str
    question_type: str
    instruction: str
    question: str
    options: list[str] | None
    correct_answer: str
    accepted_answers: list[str]
    explanation: str
    audio_url: str = LEO_MANTA_AUDIO_URL
    clip_key: str = LEO_MANTA_CLIP_KEY
    clip_title: str = LEO_MANTA_CLIP_TITLE
    points: int = 1
    active: bool = True


LISTENING_QUESTIONS: list[ListeningQuestionSeed] = [
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_01_live",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Where does Leo live?",
        options=["Quito", "Guayaquil", "Manta", "Cuenca"],
        correct_answer="Manta",
        accepted_answers=["in Manta", "He lives in Manta."],
        explanation="Leo says: 'I live in Manta with my parents.'",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_02_english",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="How often does Leo study English?",
        options=[
            "every day",
            "three times a week",
            "once a month",
            "only on weekends",
        ],
        correct_answer="three times a week",
        accepted_answers=["3 times a week", "three times a week."],
        explanation="Leo says he studies English three times a week.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_03_wake_up",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What time does Leo usually wake up?",
        options=[
            "at five o'clock",
            "at six thirty",
            "at seven o'clock",
            "at eight fifteen",
        ],
        correct_answer="at six thirty",
        accepted_answers=[
            "six thirty",
            "6:30",
            "6.30",
            "at 6:30",
            "at 6.30",
        ],
        explanation="Leo usually wakes up at six thirty.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_04_bus",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="How does Leo go to school?",
        options=[
            "He walks to school.",
            "He takes the bus to school.",
            "His parents drive him to school.",
            "He rides a bike to school.",
        ],
        correct_answer="He takes the bus to school.",
        accepted_answers=["by bus", "He takes the bus.", "take the bus"],
        explanation="After breakfast, Leo takes the bus to school.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_05_free_time",
        topic="detail",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Leo do in his free time?",
        options=[
            "He plays soccer and reads books.",
            "He plays volleyball and watches movies with his friends.",
            "He goes swimming and studies math.",
            "He plays tennis and cooks with his parents.",
        ],
        correct_answer="He plays volleyball and watches movies with his friends.",
        accepted_answers=[
            "play volleyball and watch movies",
            "volleyball and movies",
        ],
        explanation=(
            "In his free time, Leo plays volleyball and watches movies with his friends."
        ),
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_06_saturday",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What happened last Saturday?",
        options=[
            "Leo stayed at home all day.",
            "Leo's cousin invited him to the beach.",
            "Leo had an English exam.",
            "Leo visited Quito with his parents.",
        ],
        correct_answer="Leo's cousin invited him to the beach.",
        accepted_answers=[
            "His cousin invited him to the beach.",
            "His cousin invited him to the beach",
        ],
        explanation="Last Saturday was different because Leo's cousin invited him to the beach.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_07_surfing",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What new sport did Leo try at the beach?",
        options=["basketball", "tennis", "surfing", "soccer"],
        correct_answer="surfing",
        accepted_answers=["surf", "to surf", "He tried surfing."],
        explanation="Leo's cousin asked him to try surfing.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_08_nervous",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="How did Leo feel at first about surfing?",
        options=["bored", "angry", "nervous", "confident"],
        correct_answer="nervous",
        accepted_answers=["He was nervous.", "nervous."],
        explanation="Leo says: 'At first, I was nervous, but I tried it.'",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_09_never_surfed",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Had Leo ever surfed before that day?",
        options=[
            "Yes, he surfs every weekend.",
            "Yes, he had surfed once before.",
            "No, he had never surfed before that day.",
            "He does not remember.",
        ],
        correct_answer="No, he had never surfed before that day.",
        accepted_answers=["No", "never", "He has never surfed."],
        explanation="Leo has tried many sports, but he had never surfed before that day.",
    ),
    ListeningQuestionSeed(
        stable_key="listening_leo_manta_10_never_won",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Has Leo ever won a sports competition?",
        options=[
            "Yes, two volleyball competitions.",
            "Yes, a tennis competition.",
            "No, he has never won a competition.",
            "Yes, a surfing competition.",
        ],
        correct_answer="No, he has never won a competition.",
        accepted_answers=["No", "never", "He has never won."],
        explanation=(
            "Leo has participated in two volleyball competitions, "
            "but he has never won a competition."
        ),
    ),
]
