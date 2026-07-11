# Developer Guide: PronounceAI Local Evaluation Platform

Welcome to the **PronounceAI** Developer Guide. This document provides a comprehensive technical onboarding path, architectural walkthrough, and system execution guidelines for engineers, contributors, and technical interviewers.

PronounceAI is an AI-powered English pronunciation evaluation platform. It utilizes a local FastAPI backend with a quantized speech-to-text (STT) inference model and a React Single Page Application (SPA) frontend to deliver secure, low-latency, and privacy-compliant pronunciation scoring.

---

## 1. Purpose & Scope

The purpose of this guide is to:
1. **Onboard Developers**: Step-by-step setup instructions to compile and run the backend and frontend services locally.
2. **Explain Key Architecture**: Detail the flow of audio bytes from the user's microphone through transcription validation, Whisper confidence scoring, and database persistence.
3. **Detail Scoring Logic**: Document the rule-based speech classification threshold engine ($P(\text{word}) \ge 0.70$) and the accuracy computation formula.
4. **Establish DPDP Compliance**: Outline the "Privacy by Design" implementation for deletion, cascades, and local-only data processing.

---

## 2. Prerequisites & System Requirements

Before running the onboarding setup, ensure your local workstation meets the following requirements:

### Software Dependencies
*   **Operating System**: Windows 10/11, macOS, or Linux
*   **Python**: Version 3.10 or 3.11 (3.12+ may encounter library wheel issues with older `ctranslate2` builds)
*   **Node.js**: Version 18.0 or higher (LTS recommended)
*   **Database**: PostgreSQL 14 or higher (Running locally or hosted)
*   **System Utility**: `ffmpeg` binary installed and added to the system `PATH` (essential for audio duration and metadata validation)

### Hardware Recommendations
*   **RAM**: Minimum 8 GB (16 GB recommended to support concurrent React hot-reload and local model inference)
*   **CPU**: 4-Core CPU with AVX2 instruction set support (crucial for accelerating quantized `faster-whisper` execution on local hardware)

---

## 3. Step-by-Step Setup Walkthrough

Follow these steps sequentially to launch the backend API and frontend dashboard.

```mermaid
graph LR
    A[Install System Dependencies] --> B[Setup PostgreSQL Database]
    B --> C[Configure Backend env & venv]
    C --> D[Run Database Migrations]
    D --> E[Start FastAPI Backend]
    E --> F[Configure & Start React Frontend]
```

### Step 3.1: PostgreSQL Database Configuration
Create a database named `pronounce_db` and configure user credentials:
```sql
CREATE DATABASE pronounce_db;
CREATE USER pronounce_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pronounce_db TO pronounce_user;
```

### Step 3.2: Backend Installation & Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies listed in `requirements.txt`:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` root and configure the environmental variables:
   ```env
   DATABASE_URL=postgresql://pronounce_user:secure_password@localhost:5432/pronounce_db
   SECRET_KEY=generate_a_secure_jwt_token_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   UPLOAD_DIR=uploads/audio
   ```
5. Run the database migrations (Alembic or SQL scripts):
   ```bash
   alembic upgrade head
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Step 3.3: Frontend Installation & Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the Node packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` root and specify the backend endpoint:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the React development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser to verify dashboard access.

---

## 4. Scoring Methodology & Highlight Logic

PronounceAI scores pronunciation based on acoustic model word probabilities returned from local Whisper model layers:

```
[User Audio WebM] 
       │
       ▼ (ffmpeg validation)
[PCM 16kHz Wav Stream]
       │
       ▼ (faster-whisper tiny.en Inference)
[Word Level Probability Scores P(word)]
       │
 ┌─────┴──────────────────────────────────┐
 ▼ (P(word) >= 0.70)                      ▼ (P(word) < 0.70)
[Correct (UI: Green)]                    [Mispronounced (UI: Red)]
                                          │
                                          ▼ (Suggestion Engine Rules)
                                         [Improvement Suggestion Tip]
```

### 1. Acoustic Probabilities
The backend processes the uploaded audio slice via:
```python
segments, info = model.transcribe(audio_path, word_timestamps=True)
```
Whisper returns metadata for each detected word containing the probability parameter $P(\text{word}) \in [0.0, 1.0]$.

### 2. Thresholding Classification
*   **Green Flag (Correct)**: $P(\text{word}) \ge 0.70$. Indicates high acoustic alignment.
*   **Red Flag (Unclear/Mispronounced)**: $P(\text{word}) < 0.70$. Indicates acoustic mismatch or articulation error.

### 3. Session Accuracy Formula
The overall pronunciation score of an evaluation session is computed as the arithmetic mean of all individual word probabilities, scaled to a percentage:
$$\text{Accuracy Score} = \left( \frac{\sum_{i=1}^{N} P(\text{word}_i)}{N} \right) \times 100$$

### 4. Dynamic Feedback Generator
Flagged words undergo checks inside the backend's `generate_word_suggestion` helper to identify common phonetic pitfalls:
*   **Sibilants (`sh`/`ch`/`zh`)**: *"Focus on placement of your tongue behind the teeth to produce sibilant airflow."*
*   **Dental Fricatives (`th`)**: *"Place the tip of your tongue gently between your front teeth and breathe out to produce the /th/ sound."*
*   **Double Vowels (`ee`/`oo`)**: *"Elongate the double vowel sound slightly to prevent truncation."*

---

## 5. DPDP Compliance Posture (India DPDP Act 2023)

PronounceAI implements strict "Privacy by Design" parameters to comply with Section 6 and Section 12 of India's Digital Personal Data Protection (DPDP) Act 2023:

*   **Explicit Consent Verification (Section 6)**: During registration, the database logs consent flags indicating acceptance of data processing notices.
*   **Right to Erasure (Section 12)**:
    *   **Single Deletions**: Deleting a recording deletes the database metadata row and triggers Python's `os.unlink()` function to physically purge the WebM file from local disk.
    *   **Account Deletion**: Triggers cascading deletes on all recording rows and sweeps local storage directories to unlink files.
*   **Local Processing Boundary**: All voice recordings are transcribed locally on the self-hosted FastAPI server. Data is never transmitted to foreign cloud API endpoints.

---

## 6. Troubleshooting & Common Pitfalls

### Issue 6.1: `imageio-ffmpeg` / FFmpeg Binary Not Found
*   **Symptoms**: Backend crashes during transcription or returns `500 Server Error` with "ffmpeg not found" in the stack trace.
*   **Resolution**: 
    1. Verify if `ffmpeg` is installed: `ffmpeg -version`.
    2. If missing, download the static build and add its `bin` folder to your system environment variables.
    3. Ensure `imageio-ffmpeg` is installed inside the active virtual environment: `pip show imageio-ffmpeg`.

### Issue 6.2: Unicode Encoding Exceptions in PDF Generator
*   **Symptoms**: Generating the system architecture document throws `FPDFUnicodeEncodingException` for characters like `\u2013` or Greek IPA letters like `\u03b8` (/θ/).
*   **Resolution**: Clean characters before passing to the PDF cell writer using the `clean_text(text)` helper mapping special characters to ASCII equivalents (e.g. replacing `θ` with `th`).

### Issue 6.3: WebM Recording Blocked in Safari Browser
*   **Symptoms**: Frontend dashboard displays microphone errors on Apple Devices.
*   **Resolution**: HTML5 MediaRecorder web API configurations vary by browser. Set the container audio MIME type to fallback cleanly to `audio/mp4` or generic `audio/wav` formats if `audio/webm` container support is absent.

---

## 7. Next Steps & Documentation Lifecycle

Based on evolving product requirements and developer feedback, future versions of this documentation will incorporate:
1. **API Endpoint Schema Reference**: Automatically generate Sphinx/Swagger OpenAPI interactive schemas to host live endpoint testing lists.
2. **GPU Inference Config Walkthrough**: Detail setting up NVIDIA CUDA dependencies and `ctranslate2` settings to transition from CPU to GPU-backed queue models.
3. **Phoneme-Level Mapping**: Incorporate instructions for calibrating Grapheme-to-Phoneme (G2P) frameworks like Kaldi or Wav2Vec2 in future architectures.
