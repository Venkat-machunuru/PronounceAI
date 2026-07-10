from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RecordingResponse(BaseModel):
    id: int
    original_filename: str
    duration: float | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )