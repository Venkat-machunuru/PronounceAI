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

            confidence_scores.append(
                confidence
            )


            # Words with confidence below
            # 70% are marked as potentially
            # unclear or mispronounced.
            if confidence >= 0.70:
                correct_words.append(
                    word
                )

            else:
                wrong_words.append(
                    word
                )

                suggestions.append(
                    {
                        "word": word,
                        "confidence": round(
                            confidence * 100,
                            2,
                        ),
                        "message": (
                            f'The word "{word}" '
                            "was not detected "
                            "clearly. Pronounce "
                            "it more slowly and "
                            "emphasize each "
                            "syllable."
                        ),
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