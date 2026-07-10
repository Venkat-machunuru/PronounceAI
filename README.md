# PronounceAI

PronounceAI is an AI-powered English pronunciation evaluation platform. It transcribes user audio (between 30 to 45 seconds), rates clarity, highlights specific mispronunciations, provides correction suggestions, and charts historical scores over time in compliance with India's Digital Personal Data Protection (DPDP) Act 2023.

---

## 🛠️ Technology Stack
* **Frontend**: React 19 (Vite + TypeScript), Tailwind CSS, Custom SVG Analytics Charts (zero-dependency).
* **Backend**: FastAPI (Python 3.11+), `faster-whisper` (Tiny.en local CPU inference model).
* **Database**: PostgreSQL (SQLAlchemy 2.0 ORM + Alembic migrations).
* **Audio Parsing**: FFmpeg (integrated via `imageio-ffmpeg`).

---

## 🚀 Easiest Setup: Docker Compose (All-in-One)
The easiest way to run the entire backend stack (FastAPI + PostgreSQL DB) in production or local QA:

1. Ensure Docker & Docker Compose are installed.
2. Run the following command in the project root:
   ```bash
   docker-compose up --build
   ```
3. Docker will start the database, build the backend, automatically run Alembic migrations (`alembic upgrade head`), and expose the API at `http://localhost:8000`.

---

## 💻 Manual Local Development

### 1. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   * Windows: `venv\Scripts\activate`
   * Linux/macOS: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify your `.env` contains:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:Postgres%40123@localhost:5432/pronounce_ai
   SECRET_KEY=3437e77581160ea6f5055aad4a1921ee8ac28a3f73e2f0d4aa3be55eddcebac4
   ```
5. Apply migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Verify or edit backend API URL in `src/api/client.ts` (`http://localhost:8000/api`).
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## ☁️ Cloud Deployment Guide

To deploy this application publicly (satisfying Livo AI assessment requirements):

### 1. Deploy the Backend (FastAPI + Postgres)
You can deploy the backend using providers like **Render**, **Railway**, or **Fly.io**:

* **Render Deployment**:
  1. Create a **PostgreSQL Database** on Render. Copy the Internal Database URL.
  2. Create a **Web Service** on Render pointing to your GitHub repository.
  3. Select **Docker** as the runtime (Render will automatically detect the `backend/Dockerfile` if you specify it as the build context / subfolder).
  4. Add the following **Environment Variables**:
     * `DATABASE_URL`: The PostgreSQL Database connection URI (pointing to your Render database).
     * `SECRET_KEY`: A secure random hex string for signing JWT tokens.
  5. Deploy. Render will build the container, automatically run database migrations, and supply a public HTTPS endpoint (e.g., `https://pronounce-api.onrender.com`).

### 2. Deploy the Frontend (React Vite SPA)
You can deploy the frontend for free on **Vercel**, **Netlify**, or **Cloudflare Pages**:

* **Preparation**:
  * Edit `frontend/src/api/client.ts` to replace the local address with your public backend URL:
    ```typescript
    const api = axios.create({
      baseURL: "https://your-backend-render-url.com/api",
    });
    ```
* **Vercel/Netlify Deployment**:
  1. Connect your repository to Vercel/Netlify.
  2. Set the root/base directory of the project to `frontend`.
  3. Configure build settings:
     * **Build Command**: `npm run build`
     * **Output Directory**: `dist`
  4. Deploy. You will receive a public URL (e.g., `https://pronounce-ai.vercel.app`).
  5. Copy your frontend URL and ensure it matches the allowed origins in the backend `CORSMiddleware` config if you tighten CORS policies.

---

## 🔒 India DPDP Act 2023 Compliance Posture
1. **Notice & Consent**: Users must explicitly check the data processing consent checkbox on sign-up to register.
2. **Right to Erasure (Deletion)**:
   * **Individual Deletion**: Deleting a recording unlinks the physical WebM/M4A file from disk storage and cascades DB deletion to evaluations.
   * **Account Deletion**: Deleting the user profile sweeps and deletes all physical audio files associated with the user, dropping the database rows.
3. **Data Residency**: Self-hosted on local/secure cloud databases complying with localized storage constraints.
