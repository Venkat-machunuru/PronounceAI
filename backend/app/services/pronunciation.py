import re
from difflib import SequenceMatcher


def normalize_words(text: str) -> list[str]:
    return re.findall(
        r"[a-zA-Z']+",
        text.lower(),
    )


def calculate_pronunciation_score(
    expected_text: str,
    spoken_text: str,
) -> dict:
    expected_words = normalize_words(
        expected_text
    )

    spoken_words = normalize_words(
        spoken_text
    )

    if not expected_words:
        return {
            "accuracy_score": 0.0,
            "correct_words": [],
            "wrong_words": [],
            "suggestions": [],
        }

    matcher = SequenceMatcher(
        None,
        expected_words,
        spoken_words,
    )

    correct_words = []
    wrong_words = []
    suggestions = []

    for operation, i1, i2, j1, j2 in (
        matcher.get_opcodes()
    ):
        if operation == "equal":
            correct_words.extend(
                expected_words[i1:i2]
            )

        elif operation == "replace":
            expected_part = expected_words[i1:i2]
            spoken_part = spoken_words[j1:j2]

            wrong_words.extend(expected_part)

            maximum_length = max(
                len(expected_part),
                len(spoken_part),
            )

            for index in range(maximum_length):
                expected_word = (
                    expected_part[index]
                    if index < len(expected_part)
                    else None
                )

                spoken_word = (
                    spoken_part[index]
                    if index < len(spoken_part)
                    else None
                )

                suggestions.append(
                    {
                        "expected": expected_word,
                        "spoken": spoken_word,
                        "message": (
                            f"Practice the word "
                            f"'{expected_word}'."
                            if expected_word
                            else (
                                f"Extra word "
                                f"'{spoken_word}' detected."
                            )
                        ),
                    }
                )

        elif operation == "delete":
            missing_words = expected_words[i1:i2]

            wrong_words.extend(
                missing_words
            )

            for word in missing_words:
                suggestions.append(
                    {
                        "expected": word,
                        "spoken": None,
                        "message": (
                            f"The word '{word}' "
                            "was missing."
                        ),
                    }
                )

        elif operation == "insert":
            extra_words = spoken_words[j1:j2]

            for word in extra_words:
                suggestions.append(
                    {
                        "expected": None,
                        "spoken": word,
                        "message": (
                            f"Extra word '{word}' "
                            "was detected."
                        ),
                    }
                )

    accuracy_score = round(
        (
            len(correct_words)
            / len(expected_words)
        )
        * 100,
        2,
    )

    return {
        "accuracy_score": accuracy_score,
        "correct_words": correct_words,
        "wrong_words": wrong_words,
        "suggestions": suggestions,
    }