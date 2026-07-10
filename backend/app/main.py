from fastapi import FastAPI
import app.models
from app.api.auth import router as auth_router
from app.api.recordings import router as recordings_router
from app.api.evaluations import (
    router as evaluations_router,
)



app = FastAPI(
    title="PronounceAI API",
    description="AI-powered pronunciation evaluation platform",
    version="1.0.0",
)


app.include_router(auth_router)
app.include_router(evaluations_router)
app.include_router(recordings_router)


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