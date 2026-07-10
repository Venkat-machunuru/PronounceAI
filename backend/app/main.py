from fastapi import FastAPI

app = FastAPI(
    title="PronounceAI API",
    description="AI-powered pronunciation evaluation platform",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to PronounceAI API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }