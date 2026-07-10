from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models

from app.api.auth import router as auth_router
from app.api.evaluations import (
    router as evaluations_router,
)
from app.api.recordings import (
    router as recordings_router,
)


app = FastAPI(
    title="PronounceAI API",
    description=(
        "AI-powered pronunciation "
        "evaluation platform"
    ),
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=(
        r"https?://.*"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(recordings_router)
app.include_router(evaluations_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to PronounceAI API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }