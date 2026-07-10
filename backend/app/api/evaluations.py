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
    EvaluationCreate,
    EvaluationResponse,
    RecordingHistoryResponse,
)
from app.services.pronunciation import (
    calculate_pronunciation_score,
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
    evaluation_data: EvaluationCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    recording = db.scalar(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.user_id == current_user.id,
        )
    )

    if recording is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording was not found.",
        )

    existing_evaluation = db.scalar(
        select(Evaluation).where(
            Evaluation.recording_id
            == recording_id
        )
    )

    if existing_evaluation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This recording has already "
                "been evaluated."
            ),
        )

    result = calculate_pronunciation_score(
        expected_text=(
            evaluation_data.expected_text
        ),
        spoken_text=(
            evaluation_data.spoken_text
        ),
    )

    evaluation = Evaluation(
        recording_id=recording.id,
        transcript=(
            evaluation_data.spoken_text
        ),
        accuracy_score=(
            result["accuracy_score"]
        ),
        correct_words=(
            result["correct_words"]
        ),
        wrong_words=(
            result["wrong_words"]
        ),
        suggestions=(
            result["suggestions"]
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
            "recording_id": recording.id,
            "original_filename": (
                recording.original_filename
            ),
            "duration": recording.duration,
            "created_at": (
                recording.created_at
            ),
            "evaluation": (
                recording.evaluation
            ),
        }
        for recording in recordings
    ]