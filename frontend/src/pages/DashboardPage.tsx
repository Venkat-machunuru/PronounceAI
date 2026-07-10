import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import api from "../api/client";


type User = {
  id: number;
  email: string;
  created_at: string;
};


type Suggestion = {
  expected: string | null;
  spoken: string | null;
  message: string;
};


type Evaluation = {
  id: number;
  recording_id: number;
  transcript: string | null;
  accuracy_score: number;
  correct_words: string[];
  wrong_words: string[];
  suggestions: Suggestion[];
  created_at: string;
};


type HistoryItem = {
  recording_id: number;
  original_filename: string;
  duration: number | null;
  created_at: string;
  evaluation: Evaluation | null;
};


function DashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] =
    useState<User | null>(null);

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [recordingId, setRecordingId] =
    useState<number | null>(null);

  const [expectedText, setExpectedText] =
    useState("");

  const [spokenText, setSpokenText] =
    useState("");

  const [result, setResult] =
    useState<Evaluation | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const [evaluating, setEvaluating] =
    useState(false);


  const handleUnauthorized = useCallback(
    () => {
      localStorage.removeItem(
        "access_token"
      );

      navigate("/login");
    },
    [navigate]
  );


  const loadHistory = useCallback(
    async () => {
      try {
        const response = await api.get(
          "/recordings/history"
        );

        setHistory(response.data);
      } catch (requestError: unknown) {
        console.error(requestError);
      }
    },
    []
  );


  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get(
          "/auth/me"
        );

        setUser(response.data);

        await loadHistory();
      } catch {
        handleUnauthorized();
      }
    }

    loadDashboard();
  }, [
    handleUnauthorized,
    loadHistory,
  ]);


  async function uploadAudio() {
    if (!selectedFile) {
      setError(
        "Select an audio file first."
      );

      return;
    }

    setError("");
    setMessage("");
    setUploading(true);

    try {
      const formData = new FormData();

      formData.append(
        "audio",
        selectedFile
      );

      const response = await api.post(
        "/recordings/upload",
        formData
      );

      setRecordingId(
        response.data.id
      );

      setResult(null);

      setMessage(
        `Audio uploaded successfully. ` +
        `Recording ID: ${response.data.id}`
      );

      await loadHistory();
    } catch {
      setError(
        "Audio upload failed. Use MP3, WAV, M4A, or WEBM under 15 MB."
      );
    } finally {
      setUploading(false);
    }
  }


  async function evaluateAudio() {
    if (recordingId === null) {
      setError(
        "Upload an audio file before evaluation."
      );

      return;
    }

    if (
      !expectedText.trim()
      || !spokenText.trim()
    ) {
      setError(
        "Enter both expected text and spoken transcript."
      );

      return;
    }

    setError("");
    setMessage("");
    setEvaluating(true);

    try {
      const response = await api.post(
        `/recordings/${recordingId}/evaluate`,
        {
          expected_text: expectedText,
          spoken_text: spokenText,
        }
      );

      setResult(response.data);

      setMessage(
        "Pronunciation evaluation completed."
      );

      await loadHistory();
    } catch {
      setError(
        "Evaluation failed. This recording may already have been evaluated."
      );
    } finally {
      setEvaluating(false);
    }
  }


  function logout() {
    localStorage.removeItem(
      "access_token"
    );

    navigate("/login");
  }


  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>PronounceAI</h1>

          <p>
            AI-powered pronunciation
            evaluation
          </p>
        </div>

        <button onClick={logout}>
          Logout
        </button>
      </header>


      <section className="welcome-card">
        <p>Welcome back</p>

        <h2>
          {user?.email ?? "Loading..."}
        </h2>

        <p>
          Upload an audio sample and
          evaluate your pronunciation.
        </p>
      </section>


      {message && (
        <p className="success-message">
          {message}
        </p>
      )}


      {error && (
        <p className="dashboard-error">
          {error}
        </p>
      )}


      <section className="workspace-grid">
        <article className="panel">
          <h2>1. Upload Audio</h2>

          <p>
            Supported: MP3, WAV, M4A,
            and WEBM. Maximum 15 MB.
          </p>

          <input
            type="file"
            accept=".mp3,.wav,.m4a,.webm,audio/*"
            onChange={(event) =>
              setSelectedFile(
                event.target.files?.[0]
                ?? null
              )
            }
          />

          <button
            onClick={uploadAudio}
            disabled={uploading}
          >
            {uploading
              ? "Uploading..."
              : "Upload audio"}
          </button>

          {recordingId !== null && (
            <p>
              Active recording ID:{" "}
              <strong>
                {recordingId}
              </strong>
            </p>
          )}
        </article>


        <article className="panel">
          <h2>2. Evaluate</h2>

          <label htmlFor="expected">
            Expected sentence
          </label>

          <textarea
            id="expected"
            value={expectedText}
            onChange={(event) =>
              setExpectedText(
                event.target.value
              )
            }
            placeholder={
              "Enter the sentence the user should pronounce"
            }
          />

          <label htmlFor="spoken">
            Spoken transcript
          </label>

          <textarea
            id="spoken"
            value={spokenText}
            onChange={(event) =>
              setSpokenText(
                event.target.value
              )
            }
            placeholder={
              "Enter the speech-to-text transcript"
            }
          />

          <button
            onClick={evaluateAudio}
            disabled={evaluating}
          >
            {evaluating
              ? "Evaluating..."
              : "Evaluate pronunciation"}
          </button>
        </article>
      </section>


      {result && (
        <section className="result-section">
          <article className="score-card">
            <div className="score-circle">
              <strong>
                {result.accuracy_score}%
              </strong>

              <span>
                Accuracy
              </span>
            </div>

            <div>
              <h2>
                Evaluation Result
              </h2>

              <p>
                Transcript:{" "}
                {result.transcript}
              </p>
            </div>
          </article>


          <div className="result-grid">
            <article className="panel">
              <h3>Correct Words</h3>

              <div className="word-list">
                {result.correct_words
                  .length > 0
                  ? result.correct_words.map(
                    (
                      word,
                      index
                    ) => (
                      <span
                        className="correct-word"
                        key={`${word}-${index}`}
                      >
                        {word}
                      </span>
                    )
                  )
                  : (
                    <p>
                      No correct words.
                    </p>
                  )}
              </div>
            </article>


            <article className="panel">
              <h3>Wrong Words</h3>

              <div className="word-list">
                {result.wrong_words
                  .length > 0
                  ? result.wrong_words.map(
                    (
                      word,
                      index
                    ) => (
                      <span
                        className="wrong-word"
                        key={`${word}-${index}`}
                      >
                        {word}
                      </span>
                    )
                  )
                  : (
                    <p>
                      No wrong words.
                    </p>
                  )}
              </div>
            </article>
          </div>


          <article className="panel">
            <h3>Suggestions</h3>

            {result.suggestions.length > 0
              ? (
                <ul>
                  {result.suggestions.map(
                    (
                      suggestion,
                      index
                    ) => (
                      <li key={index}>
                        {suggestion.message}
                      </li>
                    )
                  )}
                </ul>
              )
              : (
                <p>
                  Excellent. No corrections
                  are required.
                </p>
              )}
          </article>
        </section>
      )}


      <section className="history-section">
        <h2>Previous Recordings</h2>

        {history.length === 0
          ? (
            <article className="panel">
              <p>
                No recordings yet.
              </p>
            </article>
          )
          : history.map((item) => (
            <article
              className="history-card"
              key={item.recording_id}
            >
              <div>
                <h3>
                  {item.original_filename}
                </h3>

                <p>
                  Recording ID:{" "}
                  {item.recording_id}
                </p>

                <p>
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </p>
              </div>

              <div>
                {item.evaluation
                  ? (
                    <strong>
                      {
                        item.evaluation
                          .accuracy_score
                      }%
                    </strong>
                  )
                  : (
                    <span>
                      Not evaluated
                    </span>
                  )}
              </div>
            </article>
          ))}
      </section>
    </main>
  );
}


export default DashboardPage;