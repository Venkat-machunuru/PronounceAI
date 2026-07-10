import { useState } from "react";
import type { FormEvent } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../api/client";


function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [consentGiven, setConsentGiven] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!consentGiven) {
      setError(
        "You must consent to the data processing policy."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post(
        "/auth/signup",
        {
          email,
          password,
        }
      );

      navigate("/login");
    } catch {
      setError(
        "Signup failed. The email may already be registered."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Create account</h1>

        <p>
          Start tracking and improving
          your pronunciation.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            minLength={8}
            required
          />

          <div className="consent-container">
            <input
              id="consent"
              type="checkbox"
              checked={consentGiven}
              onChange={(event) =>
                setConsentGiven(
                  event.target.checked
                )
              }
              required
            />

            <label
              htmlFor="consent"
              className="consent-label"
            >
              I consent to the collection,
              storage, and processing of my
              audio files for English
              pronunciation evaluation
              under the India DPDP Act
              2023. I can erase my data at
              any time.
            </label>
          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading || !consentGiven
            }
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p>
          Already registered?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}


export default SignupPage;