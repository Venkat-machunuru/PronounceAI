import {
  useCallback,
  useEffect,
  useRef,
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
  word: string;
  confidence: number;
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

  const [isRecording, setIsRecording] =
    useState(false);

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);


  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<number | null>(null);

  const recordingDurationRef =
    useRef(0);

  // Computed metrics for DPDP and analytics dashboard
  const evaluatedRecordings = Array.isArray(history)
    ? history.filter(
        (item) =>
          item.evaluation &&
          typeof item.evaluation === "object" &&
          item.evaluation.accuracy_score != null
      )
    : [];

  const averageScore =
    evaluatedRecordings.length
      ? Math.round(
          evaluatedRecordings.reduce(
            (sum, item) =>
              sum +
              item.evaluation!
                .accuracy_score,
            0
          ) / evaluatedRecordings.length
        )
      : 0;

  const highestScore =
    evaluatedRecordings.length
      ? Math.round(
          Math.max(
            ...evaluatedRecordings.map(
              (item) =>
                item.evaluation!
                  .accuracy_score
            )
          )
        )
      : 0;

  let improvementRate = 0;
  if (evaluatedRecordings.length >= 2) {
    const chronological = [
      ...evaluatedRecordings,
    ].reverse();
    const firstScore =
      chronological[0].evaluation!
        .accuracy_score;
    const latestScore =
      chronological[chronological.length - 1]
        .evaluation!.accuracy_score;
    improvementRate = Math.round(
      latestScore - firstScore
    );
  }


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


  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(
          timerRef.current
        );
      }

      const mediaRecorder =
        mediaRecorderRef.current;

      if (
        mediaRecorder
        && mediaRecorder.state
          === "recording"
      ) {
        mediaRecorder.stop();
      }
    };
  }, []);


  async function uploadAudio() {
    if (!selectedFile) {
      setError(
        "Select or record an audio file first."
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
        "Audio uploaded successfully. " +
        "It is ready for AI analysis."
      );

      await loadHistory();
} catch (requestError: any) {
  console.error(
    "Audio upload error:",
    requestError
  );

  const backendDetail =
    requestError.response
      ?.data?.detail;

  const statusCode =
    requestError.response
      ?.status;

  setError(
    backendDetail
    ?? (
      statusCode
        ? (
          `Audio upload failed. ` +
          `Server status: ${statusCode}`
        )
        : (
          "Could not connect to the backend. " +
          "Check whether Uvicorn is running."
        )
    )
  );
} finally {
  setUploading(false);
}
  }


  async function analyzeAudio() {
    if (recordingId === null) {
      setError(
        "Record or upload audio before analysis."
      );

      return;
    }

    setError("");
    setMessage("");
    setEvaluating(true);

    try {
      const response = await api.post(
        `/recordings/${recordingId}/evaluate`
      );

      setResult(response.data);

      setMessage(
        "Pronunciation analysis completed."
      );

      await loadHistory();
    } catch (requestError: unknown) {
      console.error(requestError);

      setError(
        "Analysis failed. The audio may already be analyzed, no understandable English speech may have been detected, or the AI model may still be loading."
      );
    } finally {
      setEvaluating(false);
    }
  }


  async function startRecording() {
    setError("");
    setMessage("");
    setSelectedFile(null);
    setRecordingId(null);
    setResult(null);

    try {
      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          });

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      recordingDurationRef.current = 0;


      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };


      mediaRecorder.onstop = () => {
        const duration =
          recordingDurationRef.current;

        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });


        if (duration < 30) {
          audioChunksRef.current = [];

          setSelectedFile(null);

          setError(
            "The recording must be at least 30 seconds."
          );

          return;
        }


        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm",
          }
        );


        const recordedFile =
          new File(
            [audioBlob],
            `recording-${Date.now()}.webm`,
            {
              type: "audio/webm",
            }
          );


        setSelectedFile(
          recordedFile
        );

        setMessage(
          "Recording completed. Click Upload Audio."
        );
      };


      mediaRecorder.start();

      setIsRecording(true);

      setRecordingSeconds(0);


      timerRef.current =
        window.setInterval(() => {
          setRecordingSeconds(
            (previousSeconds) => {
              const nextSeconds =
                previousSeconds + 1;

              recordingDurationRef.current =
                nextSeconds;


              if (nextSeconds >= 45) {
                if (
                  mediaRecorder.state
                  === "recording"
                ) {
                  mediaRecorder.stop();
                }

                setIsRecording(false);

                if (
                  timerRef.current
                  !== null
                ) {
                  window.clearInterval(
                    timerRef.current
                  );

                  timerRef.current =
                    null;
                }
              }

              return nextSeconds;
            }
          );
        }, 1000);
    } catch {
      setError(
        "Microphone access was denied or is unavailable."
      );
    }
  }


  function stopRecording() {
    if (recordingSeconds < 30) {
      setError(
        "Continue recording until 30 seconds."
      );

      return;
    }


    const mediaRecorder =
      mediaRecorderRef.current;


    if (
      mediaRecorder
      && mediaRecorder.state
        === "recording"
    ) {
      mediaRecorder.stop();
    }


    setIsRecording(false);


    if (
      timerRef.current !== null
    ) {
      window.clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }
  }


  async function handleDeleteRecording(
    recordingId: number
  ) {
    if (
      !window.confirm(
        "Are you sure you want to delete this recording and all its evaluation data? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/recordings/${recordingId}`
      );

      setMessage(
        "Recording deleted successfully."
      );

      await loadHistory();

      if (
        result?.recording_id === recordingId
      ) {
        setResult(null);
        setRecordingId(null);
      }
    } catch {
      setError(
        "Failed to delete the recording."
      );
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "WARNING: Are you sure you want to permanently delete your account? All your uploaded audios and evaluations will be immediately erased in compliance with the DPDP Act 2023. This action is irreversible."
      )
    ) {
      return;
    }

    try {
      await api.delete("/auth/me");

      localStorage.removeItem(
        "access_token"
      );

      navigate("/login");
    } catch {
      setError(
        "Failed to delete your account."
      );
    }
  }

  function renderTrendChart() {
    const evaluated = (Array.isArray(history) ? history : [])
      .filter(
        (item) =>
          item.evaluation &&
          typeof item.evaluation === "object" &&
          item.evaluation.accuracy_score != null
      )
      .map((item) => ({
        date: new Date(
          item.created_at
        ).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        score:
          item.evaluation!.accuracy_score,
      }))
      .reverse();

    if (evaluated.length < 2) {
      return (
        <div className="empty-chart-state">
          <p>
            Complete at least 2 evaluations
            to visualize your pronunciation
            progress.
          </p>
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const padding = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40,
    };

    const chartWidth =
      width - padding.left - padding.right;
    const chartHeight =
      height - padding.top - padding.bottom;

    const points = evaluated.map(
      (d, index) => {
        const x =
          padding.left +
          (index / (evaluated.length - 1)) *
            chartWidth;
        const y =
          padding.top +
          (1 - d.score / 100) * chartHeight;
        return {
          x,
          y,
          score: d.score,
          date: d.date,
        };
      }
    );

    const linePath = points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${
            p.x
          } ${p.y}`
      )
      .join(" ");

    const areaPath = `${linePath} L ${
      points[points.length - 1].x
    } ${height - padding.bottom} L ${
      points[0].x
    } ${height - padding.bottom} Z`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="progress-svg-chart"
      >
        <defs>
          <linearGradient
            id="chart-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#8d67e8"
              stopOpacity="0.4"
            />
            <stop
              offset="100%"
              stopColor="#8d67e8"
              stopOpacity="0.0"
            />
          </linearGradient>
          <linearGradient
            id="line-gradient"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              offset="0%"
              stopColor="#5b5ce2"
            />
            <stop
              offset="100%"
              stopColor="#8d67e8"
            />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map(
          (gridScore) => {
            const y =
              padding.top +
              (1 - gridScore / 100) *
                chartHeight;
            return (
              <g key={gridScore}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  className="chart-grid-line"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  className="chart-axis-text chart-y-axis-text"
                >
                  {gridScore}%
                </text>
              </g>
            );
          }
        )}

        {evaluated.map((p, index) => {
          const totalPoints =
            evaluated.length;
          const shouldShowLabel =
            totalPoints <= 5 ||
            index === 0 ||
            index === totalPoints - 1 ||
            index ===
              Math.floor(totalPoints / 2);

          if (!shouldShowLabel) return null;

          const x =
            padding.left +
            (index / (totalPoints - 1)) *
              chartWidth;
          return (
            <text
              key={index}
              x={x}
              y={height - 10}
              className="chart-axis-text chart-x-axis-text"
            >
              {p.date}
            </text>
          );
        })}

        <path
          d={areaPath}
          fill="url(#chart-gradient)"
        />

        <path
          d={linePath}
          fill="none"
          stroke="url(#line-gradient)"
          strokeWidth="3"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              className="chart-dot"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="9"
              className="chart-dot-hover"
            >
              <title>{`${p.date}: ${p.score}%`}</title>
            </circle>
            <text
              x={p.x}
              y={p.y - 10}
              className="chart-value-text"
            >
              {Math.round(p.score)}%
            </text>
          </g>
        ))}
      </svg>
    );
  }

  function renderCommonMistakes() {
    const wordCounts: {
      [key: string]: number;
    } = {};

    history.forEach((item) => {
      if (
        item.evaluation
        && item.evaluation.wrong_words
      ) {
        item.evaluation.wrong_words.forEach(
          (word) => {
            const normalized = word
              .toLowerCase()
              .replace(/[^a-z']/g, "");
            if (normalized) {
              wordCounts[normalized] =
                (wordCounts[normalized]
                  || 0) + 1;
            }
          }
        );
      }
    });

    const sortedMistakes = Object.entries(
      wordCounts
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedMistakes.length === 0) {
      return (
        <div className="empty-mistakes-state">
          <p>
            No mistakes detected yet! Keep
            practicing to maintain clear
            speech.
          </p>
        </div>
      );
    }

    const maxCount = sortedMistakes[0][1];

    return (
      <div className="pitfall-list">
        {sortedMistakes.map(
          ([word, count]) => {
            const percentage =
              maxCount > 0
                ? (count / maxCount) * 100
                : 0;
            return (
              <div
                key={word}
                className="pitfall-item"
              >
                <div className="pitfall-header">
                  <span className="pitfall-word">
                    "{word}"
                  </span>
                  <span className="pitfall-count">
                    {count}{" "}
                    {count === 1
                      ? "time"
                      : "times"}
                  </span>
                </div>
                <div className="pitfall-bar-bg">
                  <div
                    className="pitfall-bar-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  }

  function logout() {
    localStorage.removeItem(
      "access_token"
    );

    navigate("/login");
  }


  function getSuggestion(
    word: string
  ) {
    const suggestion =
      result?.suggestions.find(
        (item) =>
          item.word.toLowerCase()
          === word.toLowerCase()
      );


    if (!suggestion) {
      return (
        `Practice "${word}" slowly ` +
        "and pronounce every syllable clearly."
      );
    }


    return (
      `${suggestion.message}\n` +
      `AI confidence: ` +
      `${suggestion.confidence}%`
    );
  }


  function renderHighlightedWords() {
    if (!result?.transcript) {
      return null;
    }


    const wrongWordCounts =
      new Map<string, number>();


    for (
      const word
      of result.wrong_words
    ) {
      const normalized =
        word.toLowerCase();

      wrongWordCounts.set(
        normalized,
        (
          wrongWordCounts.get(
            normalized
          )
          ?? 0
        ) + 1
      );
    }


    return result.transcript
      .split(/\s+/)
      .map((word, index) => {
        const normalized =
          word
            .toLowerCase()
            .replace(
              /[^a-z']/g,
              ""
            );


        const remaining =
          wrongWordCounts.get(
            normalized
          )
          ?? 0;


        const isWrong =
          remaining > 0;


        if (isWrong) {
          wrongWordCounts.set(
            normalized,
            remaining - 1
          );
        }


        return (
          <span
            className={
              isWrong
                ? "wrong-word"
                : "correct-word"
            }
            title={
              isWrong
                ? getSuggestion(
                  normalized
                )
                : (
                  "Detected clearly"
                )
            }
            key={
              `${word}-${index}`
            }
          >
            {word}
          </span>
        );
      });
  }


  return (
    <main className="dashboard-page">
      <header
        className="dashboard-header"
      >
        <div>
          <h1>PronounceAI</h1>

          <p>
            AI-powered English
            pronunciation evaluation
          </p>
        </div>

        <button onClick={logout}>
          Logout
        </button>
      </header>


      <section
        className="welcome-card"
      >
        <div className="welcome-card-header">
          <div>
            <p>Welcome back</p>

            <h2>
              {user?.email
                ?? "Loading..."}
            </h2>
          </div>

          <button
            type="button"
            className="delete-account-btn"
            onClick={
              handleDeleteAccount
            }
            title="Permanently erase your account and all data under DPDP Act 2023"
          >
            Delete Account
          </button>
        </div>

        <p>
          Record or upload 30–45
          seconds of English speech.
          You can speak naturally;
          no reference sentence is
          required.
        </p>
      </section>

      {/* Analytics & Progress Dashboard */}
      <section className="analytics-section">
        <div className="analytics-summary-grid">
          <div className="analytics-card">
            <h4>Total Sessions</h4>
            <strong>{history.length}</strong>
            <p>Recordings uploaded</p>
          </div>

          <div className="analytics-card">
            <h4>Average Score</h4>
            <strong>{averageScore}%</strong>
            <p>Overall accuracy</p>
          </div>

          <div className="analytics-card">
            <h4>Highest Score</h4>
            <strong>{highestScore}%</strong>
            <p>Best attempt accuracy</p>
          </div>

          <div className="analytics-card">
            <h4>Improvement</h4>
            <strong
              className={
                improvementRate >= 0
                  ? "positive-metric"
                  : "negative-metric"
              }
            >
              {improvementRate >= 0
                ? `+${improvementRate}%`
                : `${improvementRate}%`}
            </strong>
            <p>Since your first session</p>
          </div>
        </div>

        <div className="analytics-details-grid">
          <div className="panel chart-panel">
            <h3>Pronunciation Trend</h3>

            <p>
              Accuracy scores across your
              attempts
            </p>

            <div className="chart-wrapper">
              {renderTrendChart()}
            </div>
          </div>

          <div className="panel mistakes-panel">
            <h3>Common Pitfalls</h3>

            <p>
              Words you most frequently
              mispronounce
            </p>

            <div className="mistakes-wrapper">
              {renderCommonMistakes()}
            </div>
          </div>
        </div>
      </section>


      {message && (
        <p
          className="success-message"
        >
          {message}
        </p>
      )}


      {error && (
        <p
          className="dashboard-error"
        >
          {error}
        </p>
      )}


      <section
        className="workspace-grid"
      >
        <article className="panel">
          <h2>
            1. Record Audio
          </h2>

          <p>
            Speak naturally in English
            for 30–45 seconds.
          </p>


          <div
            className="recorder-box"
          >
            <h3>
              Microphone Recording
            </h3>

            <strong>
              {recordingSeconds}
              {" "}
              seconds
            </strong>


            {!isRecording ? (
              <button
                type="button"
                onClick={
                  startRecording
                }
              >
                Start Recording
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={
                    stopRecording
                  }
                  disabled={
                    recordingSeconds
                    < 30
                  }
                >
                  {
                    recordingSeconds
                    < 30
                      ? (
                        `Continue — ${
                          30
                          - recordingSeconds
                        }s remaining`
                      )
                      : (
                        "Stop and Use Recording"
                      )
                  }
                </button>

                <p>
                  {
                    recordingSeconds
                    < 30
                      ? (
                        "Keep speaking until the minimum duration is reached."
                      )
                      : (
                        "You can stop now. Recording automatically stops at 45 seconds."
                      )
                  }
                </p>
              </>
            )}
          </div>
        </article>


        <article className="panel">
          <h2>
            2. Upload Audio
          </h2>

          <p>
            You can also upload MP3,
            WAV, M4A, or WEBM audio.
            Maximum size: 15 MB.
          </p>


          <input
            type="file"
            accept={
              ".mp3,.wav,.m4a," +
              ".webm,audio/*"
            }
            disabled={isRecording}
            onChange={(event) => {
              setSelectedFile(
                event.target
                  .files?.[0]
                ?? null
              );

              setRecordingId(null);

              setResult(null);
            }}
          />


          {selectedFile && (
            <p>
              Selected audio:{" "}
              <strong>
                {selectedFile.name}
              </strong>
            </p>
          )}


          <button
            type="button"
            onClick={uploadAudio}
            disabled={
              uploading
              || isRecording
              || !selectedFile
            }
          >
            {uploading
              ? "Uploading..."
              : "Upload Audio"}
          </button>


          {recordingId !== null && (
            <p>
              Audio is ready for
              pronunciation analysis.
            </p>
          )}
        </article>
      </section>


      <section
        className="result-section"
      >
        <article className="panel">
          <h2>
            3. Analyze Pronunciation
          </h2>

          <p>
            AI automatically
            transcribes the audio,
            evaluates speech clarity,
            and identifies words that
            may need improvement.
          </p>


          <button
            type="button"
            onClick={analyzeAudio}
            disabled={
              evaluating
              || recordingId === null
            }
          >
            {evaluating
              ? (
                "Analyzing pronunciation..."
              )
              : (
                "Analyze Pronunciation"
              )}
          </button>
        </article>
      </section>


      {result && (
        <section
          className="result-section"
        >
          <article
            className="score-card"
          >
            <div
              className="score-circle"
            >
              <strong>
                {
                  result
                    .accuracy_score
                }%
              </strong>

              <span>
                Pronunciation
              </span>
            </div>

            <div>
              <h2>
                Pronunciation Result
              </h2>

              <p>
                Green words were
                detected clearly.
                Red words may need
                pronunciation
                improvement.
              </p>
            </div>
          </article>


          <article className="panel">
            <h3>
              Speech Analysis
            </h3>

            <p>
              Move the cursor over a
              red word to see its
              improvement suggestion.
            </p>


            <div
              className={
                "highlighted-transcript"
              }
            >
              {
                renderHighlightedWords()
              }
            </div>
          </article>


          <article className="panel">
            <h3>
              Improvement Suggestions
            </h3>

            {
              result.suggestions
                .length > 0
                ? (
                  <ul>
                    {
                      result
                        .suggestions
                        .map(
                          (
                            suggestion,
                            index
                          ) => (
                            <li
                              key={
                                `${suggestion.word}-${index}`
                              }
                            >
                              <strong>
                                {
                                  suggestion
                                    .word
                                }
                              </strong>
                              {": "}
                              {
                                suggestion
                                  .message
                              }
                            </li>
                          )
                        )
                    }
                  </ul>
                )
                : (
                  <p>
                    All detected words
                    were clear. Keep
                    practicing for
                    consistent speech.
                  </p>
                )
            }
          </article>
        </section>
      )}


      <section
        className="history-section"
      >
        <h2>
          Previous Recordings
        </h2>

        {
          history.length === 0
            ? (
              <article
                className="panel"
              >
                <p>
                  No recordings yet.
                </p>
              </article>
            )
            : (
              history.map(
                (item) => (
                  <article
                    className={
                      "history-card"
                    }
                    key={
                      item
                        .recording_id
                    }
                  >
                    <div>
                      <h3>
                        {
                          item
                            .original_filename
                        }
                      </h3>

                      <p>
                        {
                          new Date(
                            item
                              .created_at
                          )
                            .toLocaleString()
                        }
                      </p>
                    </div>

                    <div className="history-actions">
                      {
                        item
                          .evaluation
                          ? (
                            <strong className="history-score">
                              {
                                item
                                  .evaluation
                                  .accuracy_score
                              }%
                            </strong>
                          )
                          : (
                            <span className="history-pending">
                              Not analyzed
                            </span>
                          )
                      }

                      <button
                        type="button"
                        className="delete-recording-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecording(
                            item.recording_id
                          );
                        }}
                        title="Delete this recording"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )
              )
            )
        }
      </section>
    </main>
  );
}


export default DashboardPage;