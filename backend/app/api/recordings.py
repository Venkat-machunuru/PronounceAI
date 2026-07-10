from pathlib import Path
from shutil import copyfileobj
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import (
    get_current_user,
)
from app.db.database import get_db
from app.models.recording import (
    Recording,
)
from app.models.user import User
from app.services.audio_validation import (
    validate_audio_duration,
)


router = APIRouter(
    prefix="/api/recordings",
    tags=["Recordings"],
)


UPLOAD_DIRECTORY = Path(
    "uploads/audio"
)

UPLOAD_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".m4a",
    ".webm",
}


MAX_FILE_SIZE = (
    15 * 1024 * 1024
)


@router.post(
    "/upload",
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def upload_recording(
    audio: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    original_filename = (
        audio.filename
        or "recording.webm"
    )

    extension = (
        Path(original_filename)
        .suffix
        .lower()
    )


    if (
        extension
        not in ALLOWED_EXTENSIONS
    ):
        raise HTTPException(
            status_code=(
                status
                .HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Unsupported audio format. "
                "Use MP3, WAV, M4A, "
                "or WEBM."
            ),
        )


    stored_filename = (
        f"{uuid4().hex}"
        f"{extension}"
    )

    file_path = (
        UPLOAD_DIRECTORY
        / stored_filename
    )


    try:
        with file_path.open(
            "wb"
        ) as destination:
            copyfileobj(
                audio.file,
                destination,
            )

    except Exception as error:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not save "
                "the audio file."
            ),
        ) from error

    finally:
        audio.file.close()


    file_size = (
        file_path.stat().st_size
    )


    if file_size == 0:
        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=422,
            detail=(
                "The uploaded audio "
                "file is empty."
            ),
        )


    if file_size > MAX_FILE_SIZE:
        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=413,
            detail=(
                "Audio file must not "
                "exceed 15 MB."
            ),
        )


    try:
        audio_duration = (
            validate_audio_duration(
                file_path
            )
        )

    except ValueError as error:
        file_path.unlink(
            missing_ok=True
        )

        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error


    recording = Recording(
        user_id=current_user.id,
        original_filename=(
            original_filename
        ),
        audio_path=str(
            file_path
        ),
        duration=audio_duration,
    )


    db.add(recording)
    db.commit()
    db.refresh(recording)


    return {
        "id": recording.id,
        "original_filename": (
            recording
            .original_filename
        ),
        "duration": (
            recording.duration
        ),
        "created_at": (
            recording.created_at
        ),
    }


@router.delete(
    "/{recording_id}",
    status_code=status.HTTP_200_OK,
)
def delete_recording(
    recording_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
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

    # Delete the physical file from disk
    audio_file_path = Path(
        recording.audio_path
    )
    try:
        audio_file_path.unlink(
            missing_ok=True
        )
    except Exception as error:
        print(
            "Error deleting audio file "
            f"from disk: {error}"
        )

    db.delete(recording)
    db.commit()

    return {
        "message": (
            "Recording and associated "
            "analysis deleted successfully."
        )
    }