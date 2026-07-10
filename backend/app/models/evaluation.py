from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    recording_id: Mapped[int] = mapped_column(
        ForeignKey(
            "recordings.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
        index=True,
    )

    transcript: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    accuracy_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    correct_words: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    wrong_words: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    suggestions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    recording = relationship(
        "Recording",
        back_populates="evaluation",
    )