import { useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../api/client";


function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post(
        "/auth/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      navigate("/dashboard");
    } catch {
      setError(
        "Login failed. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>PronounceAI</h1>

        <p>
          Sign in to continue improving
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

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        <p>
          New to PronounceAI?{" "}
          <Link to="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}


export default LoginPage;