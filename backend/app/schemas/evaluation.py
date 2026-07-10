from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvaluationCreate(BaseModel):
    expected_text: str = Field(
        min_length=1,
        max_length=2000,
    )

    spoken_text: str = Field(
        min_length=1,
        max_length=2000,
    )


class EvaluationResponse(BaseModel):
    id: int
    recording_id: int
    transcript: str | None
    accuracy_score: float
    correct_words: list[str]
    wrong_words: list[str]
    suggestions: list[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class RecordingHistoryResponse(BaseModel):
    recording_id: int
    original_filename: str
    duration: float | None
    created_at: datetime
    evaluation: EvaluationResponse | None