from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.evaluation import Evaluation
from app.models.recording import Recording
from app.models.user import User
from app.schemas.evaluation import (
    EvaluationResponse,
    RecordingHistoryResponse,
)
from app.services.transcription import (
    analyze_pronunciation,
)


router = APIRouter(
    prefix="/api",
    tags=["Pronunciation Evaluation"],
)


@router.post(
    "/recordings/{recording_id}/evaluate",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
)
def evaluate_recording(
    recording_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # Find the recording and confirm
    # that it belongs to the logged-in user.
    recording = db.scalar(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.user_id
            == current_user.id,
        )
    )

    if recording is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Recording was not found."
            ),
        )


    # Prevent the same recording from
    # being evaluated more than once.
    existing_evaluation = db.scalar(
        select(Evaluation).where(
            Evaluation.recording_id
            == recording_id
        )
    )

    if existing_evaluation:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "This recording has already "
                "been evaluated."
            ),
        )


    # Whisper transcribes the audio and
    # returns word-level confidence data.
    try:
        analysis = analyze_pronunciation(
            recording.audio_path
        )

    except Exception as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Audio analysis failed. "
                f"{str(error)}"
            ),
        ) from error


    # Stop if Whisper could not detect
    # understandable English speech.
    if not analysis["transcript"]:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_CONTENT
            ),
            detail=(
                "No understandable English "
                "speech was detected."
            ),
        )


    # Save the automatic analysis result.
    evaluation = Evaluation(
        recording_id=recording.id,
        transcript=(
            analysis["transcript"]
        ),
        accuracy_score=(
            analysis["accuracy_score"]
        ),
        correct_words=(
            analysis["correct_words"]
        ),
        wrong_words=(
            analysis["wrong_words"]
        ),
        suggestions=(
            analysis["suggestions"]
        ),
    )

    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return evaluation


@router.get(
    "/recordings/history",
    response_model=list[
        RecordingHistoryResponse
    ],
)
def get_recording_history(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    recordings = db.scalars(
        select(Recording)
        .where(
            Recording.user_id
            == current_user.id
        )
        .order_by(
            Recording.created_at.desc()
        )
    ).all()

    return [
        {
            "recording_id": (
                recording.id
            ),
            "original_filename": (
                recording.original_filename
            ),
            "duration": (
                recording.duration
            ),
            "created_at": (
                recording.created_at
            ),
            "evaluation": (
                recording.evaluation
            ),
        }
        for recording in recordings
    ]