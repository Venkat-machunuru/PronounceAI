import re
from pathlib import Path
from typing import Any

from faster_whisper import WhisperModel


# Lightweight English Whisper model
# suitable for a CPU-based MVP.
model = WhisperModel(
    "tiny.en",
    device="cpu",
    compute_type="int8",
)


def generate_word_suggestion(word: str) -> str:
    word_lower = word.lower()
    word_cap = word.capitalize()
    
    # Rules based on common pronunciation difficulties
    if "th" in word_lower:
        return f"Focus on the 'th' sound in '{word_cap}'. Place your tongue between your teeth and blow gently."
    elif "sh" in word_lower:
        return f"Check the 'sh' sound in '{word_cap}'. Push your lips forward and blow air to make the sound."
    elif "ch" in word_lower:
        return f"Check the 'ch' sound in '{word_cap}'. Push your lips forward and release a quick burst of air."
    elif word_lower.endswith("ing"):
        return f"Ensure the ending '-ing' sound in '{word_cap}' is clear and nasal, not cut short."
    elif word_lower.endswith("tion") or word_lower.endswith("sion"):
        return f"Ensure the '-tion'/'-sion' suffix in '{word_cap}' is pronounced as a soft 'shun' sound."
    elif word_lower.endswith("ed"):
        return f"For the past tense '-ed' ending in '{word_cap}', check if it should sound like 't', 'd', or 'id'."
    elif any(v in word_lower for v in ["ea", "ee", "oo", "ai", "ou"]):
        return f"Pay attention to the vowel combination in '{word_cap}'. Make sure you hold it for the correct duration."
    elif "r" in word_lower:
        return f"Focus on the 'r' sound in '{word_cap}'. Curl the tip of your tongue slightly backward without touching the mouth roof."
    elif "l" in word_lower:
        return f"Focus on the 'l' sound in '{word_cap}'. Touch the tip of your tongue to the roof of your mouth behind your front teeth."
    elif "v" in word_lower:
        return f"Focus on the 'v' sound in '{word_cap}'. Touch your upper teeth to your lower lip and make a vibrating sound."
    elif "f" in word_lower:
        return f"Focus on the 'f' sound in '{word_cap}'. Touch your upper teeth to your lower lip and blow air."
    
    # Syllable fallback rules
    vowels = "aeiouy"
    count = 0
    if len(word_lower) > 0:
        if word_lower[0] in vowels:
            count += 1
        for index in range(1, len(word_lower)):
            if word_lower[index] in vowels and word_lower[index - 1] not in vowels:
                count += 1
        if word_lower.endswith("e"):
            count -= 1
        if count <= 0:
            count = 1
            
    if count == 1:
        return f"'{word_cap}' is a short one-syllable word. Ensure the vowel sound is clear and you complete the final consonant sound."
    elif count == 2:
        return f"'{word_cap}' has two syllables. Focus on where the word stress falls (typically on the first syllable for nouns, second for verbs)."
    else:
        return f"'{word_cap}' has {count} syllables. Practice breaking it down into smaller parts and make sure you do not skip or swallow any syllables."


def analyze_pronunciation(
    audio_path: str | Path,
) -> dict[str, Any]:
    segments, _ = model.transcribe(
        str(audio_path),
        language="en",
        beam_size=5,
        vad_filter=True,
        word_timestamps=True,
    )

    transcript_words: list[str] = []

    correct_words: list[str] = []

    wrong_words: list[str] = []

    suggestions: list[
        dict[str, Any]
    ] = []

    confidence_scores: list[float] = []


    for segment in segments:
        if not segment.words:
            continue

        for word_data in segment.words:
            word = word_data.word.strip()

            if not word:
                continue


            probability = (
                word_data.probability
            )

            if probability is None:
                probability = 0.0


            confidence = max(
                0.0,
                min(
                    float(probability),
                    1.0,
                ),
            )


            transcript_words.append(
                word
            )

            # Clean/normalize the word for matching purposes
            cleaned_word = re.sub(r"[^a-zA-Z']", "", word.lower())

            if cleaned_word:
                confidence_scores.append(
                    confidence
                )

                # Words with confidence below
                # 70% are marked as potentially
                # unclear or mispronounced.
                if confidence >= 0.70:
                    correct_words.append(
                        cleaned_word
                    )

                else:
                    wrong_words.append(
                        cleaned_word
                    )

                    suggestions.append(
                        {
                            "word": cleaned_word,
                            "confidence": round(
                                confidence * 100,
                                2,
                            ),
                            "message": generate_word_suggestion(cleaned_word),
                        }
                    )


    transcript = " ".join(
        transcript_words
    ).strip()


    if confidence_scores:
        accuracy_score = round(
            (
                sum(confidence_scores)
                / len(
                    confidence_scores
                )
            )
            * 100,
            2,
        )

    else:
        accuracy_score = 0.0


    return {
        "transcript": transcript,
        "accuracy_score": (
            accuracy_score
        ),
        "correct_words": (
            correct_words
        ),
        "wrong_words": (
            wrong_words
        ),
        "suggestions": (
            suggestions
        ),
    }