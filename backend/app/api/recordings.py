from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.recording import Recording
from app.models.user import User
from app.schemas.recording import RecordingResponse


router = APIRouter(
    prefix="/api/recordings",
    tags=["Recordings"],
)


UPLOAD_DIRECTORY = Path("uploads/audio")

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


MAX_FILE_SIZE = 15 * 1024 * 1024


@router.post(
    "/upload",
    response_model=RecordingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_recording(
    audio: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    original_filename = (
        audio.filename or "recording"
    )

    extension = Path(
        original_filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported audio format. "
                "Allowed formats: "
                "MP3, WAV, M4A, and WEBM."
            ),
        )

    file_content = await audio.read()

    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded audio file is empty.",
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                "Audio file is too large. "
                "Maximum size is 15 MB."
            ),
        )

    stored_filename = (
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        UPLOAD_DIRECTORY / stored_filename
    )

    try:
        file_path.write_bytes(
            file_content
        )

        recording = Recording(
            user_id=current_user.id,
            audio_path=str(file_path),
            original_filename=original_filename,
            duration=None,
        )

        db.add(recording)
        db.commit()
        db.refresh(recording)

        return recording

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail="Audio upload failed.",
        )

    finally:
        await audio.close()