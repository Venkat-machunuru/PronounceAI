from pathlib import Path
import subprocess

import imageio_ffmpeg


MIN_AUDIO_DURATION = 30
MAX_AUDIO_DURATION = 45


def get_audio_duration(
    audio_path: str | Path,
) -> float:
    ffmpeg_path = (
        imageio_ffmpeg
        .get_ffmpeg_exe()
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

    output = process.stderr

    duration_marker = "Duration: "

    marker_position = output.find(
        duration_marker
    )

    if marker_position == -1:
        raise ValueError(
            "Could not read the audio duration."
        )

    duration_text = output[
        marker_position
        + len(duration_marker):
    ].split(",")[0]

    hours, minutes, seconds = (
        duration_text.split(":")
    )

    duration = (
        int(hours) * 3600
        + int(minutes) * 60
        + float(seconds)
    )

    return round(duration, 2)


def validate_audio_duration(
    audio_path: str | Path,
) -> float:
    duration = get_audio_duration(
        audio_path
    )

    if duration < MIN_AUDIO_DURATION:
        raise ValueError(
            "Audio must be at least "
            "30 seconds long."
        )

    if duration > MAX_AUDIO_DURATION:
        raise ValueError(
            "Audio must not be longer "
            "than 45 seconds."
        )

    return duration