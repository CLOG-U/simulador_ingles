"""Banco inicial de Listening Practice: clips + preguntas."""

from dataclasses import dataclass

LEO_MANTA_AUDIO_URL = "/audio/leo-manta.mp3"
LEO_MANTA_CLIP_KEY = "leo-manta"
LEO_MANTA_CLIP_TITLE = "Listening 1: The Life of Leo"

DANIEL_SATURDAY_AUDIO_URL = "/audio/daniel-saturday.mp3"
DANIEL_SATURDAY_CLIP_KEY = "daniel-saturday"
DANIEL_SATURDAY_CLIP_TITLE = "Listening 2: A Different Saturday"

EMILY_PHOTOGRAPHY_AUDIO_URL = "/audio/emily-photography.mp3"
EMILY_PHOTOGRAPHY_CLIP_KEY = "emily-photography"
EMILY_PHOTOGRAPHY_CLIP_TITLE = "Listening 3: My Favorite Hobby"


@dataclass(frozen=True)
class ListeningClipSeed:
    clip_key: str
    title: str
    description: str
    audio_url: str
    sort_order: int = 1


LISTENING_CLIPS: list[ListeningClipSeed] = [
    ListeningClipSeed(
        clip_key=LEO_MANTA_CLIP_KEY,
        title=LEO_MANTA_CLIP_TITLE,
        description=(
            "Leo talks about his life in Manta, a Saturday at the beach, "
            "and the sports he has tried. You will hear Present Simple, "
            "Past Simple and Present Perfect."
        ),
        audio_url=LEO_MANTA_AUDIO_URL,
        sort_order=1,
    ),
    ListeningClipSeed(
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        title=DANIEL_SATURDAY_CLIP_TITLE,
        description=(
            "Daniel talks about his usual school day and a Saturday at the "
            "beach with his family. You will hear Present Simple, Past Simple "
            "and Present Perfect."
        ),
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        sort_order=2,
    ),
    ListeningClipSeed(
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
        description=(
            "Emily talks about photography, a trip to the mountains, "
            "and a competition she has not entered yet. You will hear "
            "Present Simple, Past Simple and Present Perfect."
        ),
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        sort_order=3,
    ),
]


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
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_01_live",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Who does Daniel live with?",
        options=[
            "his parents",
            "his mother and his younger brother",
            "his cousins",
            "his father and his sister",
        ],
        correct_answer="his mother and his younger brother",
        accepted_answers=[
            "his mom and his brother",
            "his mother and brother",
            "He lives with his mother and his younger brother.",
        ],
        explanation="Daniel lives with his mother and his younger brother.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_02_wake_up",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What time does Daniel usually wake up?",
        options=[
            "at six thirty",
            "at seven o'clock",
            "at eight o'clock",
            "at five o'clock",
        ],
        correct_answer="at seven o'clock",
        accepted_answers=["seven", "7:00", "at 7", "at seven"],
        explanation="Daniel usually wakes up at seven in the morning.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_03_breakfast",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Daniel do before he goes to school?",
        options=[
            "He plays basketball.",
            "He has breakfast.",
            "He goes to the beach.",
            "He does his homework.",
        ],
        correct_answer="He has breakfast.",
        accepted_answers=["have breakfast", "He has breakfast", "breakfast"],
        explanation="Daniel has breakfast before he goes to school.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_04_after_school",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Daniel normally do after school?",
        options=[
            "He plays volleyball.",
            "He plays basketball with his friends.",
            "He goes surfing.",
            "He stays at home and watches movies.",
        ],
        correct_answer="He plays basketball with his friends.",
        accepted_answers=[
            "play basketball",
            "He plays basketball.",
            "basketball with his friends",
        ],
        explanation="After school, Daniel normally plays basketball with his friends.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_05_saturday",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What did Daniel and his family do last Saturday?",
        options=[
            "They stayed at home.",
            "They went to the beach.",
            "They visited a museum.",
            "They played basketball at school.",
        ],
        correct_answer="They went to the beach.",
        accepted_answers=["went to the beach", "They went to the beach"],
        explanation="Last Saturday, Daniel's family went to the beach.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_06_arrived",
        topic="detail",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="When did they arrive at the beach?",
        options=[
            "late in the afternoon",
            "at night",
            "early in the morning",
            "after lunch",
        ],
        correct_answer="early in the morning",
        accepted_answers=["early", "in the morning", "early morning"],
        explanation="They arrived early in the morning.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_07_activities",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What did they do at the beach?",
        options=[
            "They played soccer and ate dinner.",
            "They played volleyball and ate lunch near the sea.",
            "They went kayaking and swimming.",
            "They studied English.",
        ],
        correct_answer="They played volleyball and ate lunch near the sea.",
        accepted_answers=[
            "played volleyball and ate lunch",
            "volleyball and lunch",
        ],
        explanation="They played volleyball and ate lunch near the sea.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_08_surfing",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Who tried surfing for the first time?",
        options=[
            "Daniel",
            "Daniel's mother",
            "Daniel's younger brother",
            "Daniel's friends",
        ],
        correct_answer="Daniel's younger brother",
        accepted_answers=[
            "his brother",
            "his younger brother",
            "Daniel's brother",
        ],
        explanation="Daniel's brother tried surfing for the first time.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_09_never_surfed",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Has Daniel ever tried surfing?",
        options=[
            "Yes, he surfs every weekend.",
            "Yes, he tried it last Saturday.",
            "No, he has never tried surfing.",
            "He tried it once last year.",
        ],
        correct_answer="No, he has never tried surfing.",
        accepted_answers=["No", "never", "He has never tried surfing."],
        explanation="Daniel has been to the beach many times, but he has never tried surfing.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_daniel_saturday_10_water",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Which water activities has Daniel tried?",
        options=[
            "surfing and kayaking",
            "kayaking and swimming",
            "swimming and diving",
            "surfing and swimming",
        ],
        correct_answer="kayaking and swimming",
        accepted_answers=["kayaking and swimming.", "kayak and swim"],
        explanation="Daniel has tried kayaking and swimming.",
        audio_url=DANIEL_SATURDAY_AUDIO_URL,
        clip_key=DANIEL_SATURDAY_CLIP_KEY,
        clip_title=DANIEL_SATURDAY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_01_hobby",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Emily love?",
        options=["painting", "photography", "dancing", "cooking"],
        correct_answer="photography",
        accepted_answers=["taking pictures", "photos", "She loves photography."],
        explanation="Emily says: 'I love photography.'",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_02_phone",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Emily usually use to take pictures?",
        options=[
            "her father's camera",
            "her phone",
            "a school camera",
            "her brother's laptop",
        ],
        correct_answer="her phone",
        accepted_answers=["her cellphone", "her mobile phone", "a phone"],
        explanation="Emily usually takes pictures with her phone.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_03_camera",
        topic="present_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Whose camera does Emily sometimes use?",
        options=[
            "her teacher's camera",
            "her friend's camera",
            "her father's camera",
            "her mother's camera",
        ],
        correct_answer="her father's camera",
        accepted_answers=["her dad's camera", "her father's"],
        explanation="Sometimes Emily uses her father's camera.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_04_subjects",
        topic="detail",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What does Emily like taking pictures of?",
        options=[
            "cars, buildings, and food",
            "animals, sunsets, and her friends",
            "sports, schools, and cities",
            "flowers, beaches, and her family",
        ],
        correct_answer="animals, sunsets, and her friends",
        accepted_answers=["animals, sunsets, and friends"],
        explanation="Emily likes taking pictures of animals, sunsets, and her friends.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_05_trip",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Where did Emily's family travel last month?",
        options=[
            "to the beach",
            "to the mountains",
            "to another city",
            "to a photography museum",
        ],
        correct_answer="to the mountains",
        accepted_answers=["the mountains", "They traveled to the mountains."],
        explanation="Last month, Emily's family traveled to the mountains.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_06_hundred",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="How many photos did Emily take during the trip?",
        options=[
            "fewer than fifty",
            "exactly one hundred",
            "more than one hundred",
            "about ten",
        ],
        correct_answer="more than one hundred",
        accepted_answers=["more than 100", "over one hundred"],
        explanation="Emily took more than one hundred photos during the trip.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_07_sunrise",
        topic="past_simple",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What did they watch one morning?",
        options=["the sunset", "the sunrise", "a movie", "the rain"],
        correct_answer="the sunrise",
        accepted_answers=["sunrise", "They watched the sunrise."],
        explanation="One morning they woke up very early and watched the sunrise.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_08_thousands",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="How many photos has Emily taken in her life?",
        options=["about one hundred", "thousands", "only a few", "none"],
        correct_answer="thousands",
        accepted_answers=["thousands of photos", "She has taken thousands of photos."],
        explanation="Emily has taken thousands of photos in her life.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_09_competition",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="Has Emily ever entered a photography competition?",
        options=[
            "Yes, she won last year.",
            "Yes, she entered one last month.",
            "No, she has never entered a photography competition.",
            "She enters competitions every year.",
        ],
        correct_answer="No, she has never entered a photography competition.",
        accepted_answers=["No", "never", "She has never entered a competition."],
        explanation="Emily has never entered a photography competition.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
    ListeningQuestionSeed(
        stable_key="listening_emily_photography_10_teacher",
        topic="present_perfect",
        question_type="multiple_choice",
        instruction="Listen and choose the correct answer.",
        question="What has Emily's teacher told her?",
        options=[
            "She should stop taking photos.",
            "Some of her photos are very good.",
            "She must buy a new camera.",
            "She has already won a competition.",
        ],
        correct_answer="Some of her photos are very good.",
        accepted_answers=[
            "her photos are very good",
            "some of her photos are good",
        ],
        explanation="Emily's teacher has told her that some of her photos are very good.",
        audio_url=EMILY_PHOTOGRAPHY_AUDIO_URL,
        clip_key=EMILY_PHOTOGRAPHY_CLIP_KEY,
        clip_title=EMILY_PHOTOGRAPHY_CLIP_TITLE,
    ),
]
