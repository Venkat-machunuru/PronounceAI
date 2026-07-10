from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
)


class EvaluationResponse(BaseModel):
    id: int
    recording_id: int
    transcript: str | None
    accuracy_score: float
    correct_words: list[str]
    wrong_words: list[str]
    suggestions: list[
        dict[str, Any]
    ]
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class RecordingHistoryResponse(
    BaseModel
):
    recording_id: int
    original_filename: str
    duration: float | None
    created_at: datetime
    evaluation: (
        EvaluationResponse | None
    )