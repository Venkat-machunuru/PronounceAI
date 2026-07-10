from pathlib import Path
import subprocess

import imageio_ffmpeg


MIN_DURATION_SECONDS = 30
MAX_DURATION_SECONDS = 45


def get_audio_duration(
    audio_path: str | Path,
) -> float:
    ffmpeg_path = (
        imageio_ffmpeg.get_ffmpeg_exe()
    )

    command = [
        ffmpeg_path,
        "-i",
        str(audio_path),
        "-f",
        "null",
        "-",
    ]

    process = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        creationflags=(
            subprocess.CREATE_NO_WINDOW
        ),
    )

    ffmpeg_output = process.stderr

    duration_marker = "Duration: "

    marker_index = (
        ffmpeg_output.find(
            duration_marker
        )
    )

    if marker_index == -1:
        raise ValueError(
            "The uploaded file is not "
            "a valid or readable audio file."
        )

    duration_text = (
        ffmpeg_output[
            marker_index
            + len(duration_marker):
        ]
        .split(",")[0]
        .strip()
    )

    try:
        hours, minutes, seconds = (
            duration_text.split(":")
        )

        duration = (
            int(hours) * 3600
            + int(minutes) * 60
            + float(seconds)
        )

    except (
        TypeError,
        ValueError,
    ) as error:
        raise ValueError(
            "Could not determine the "
            "audio duration."
        ) from error

    return round(duration, 2)


def validate_audio_duration(
    audio_path: str | Path,
) -> float:
    duration = get_audio_duration(
        audio_path
    )

    if (
        duration
        < MIN_DURATION_SECONDS
    ):
        raise ValueError(
            "Audio must be between "
            "30 and 45 seconds. "
            f"Uploaded audio is "
            f"{duration} seconds."
        )

    if (
        duration
        > MAX_DURATION_SECONDS
    ):
        raise ValueError(
            "Audio must be between "
            "30 and 45 seconds. "
            f"Uploaded audio is "
            f"{duration} seconds."
        )

    return duration