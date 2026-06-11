import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/events" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (loginError) {
      console.error(loginError);
      setError("Could not log in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-panel">
        <img className="login-logo" src="/flair-logo.png" alt="Flair" />

        <form className="login-card" onSubmit={handleSubmit}>
          <h3 className="page-title">Welcome</h3>
          <p className="page-subtitle">Please sign in</p>

          <div className="login-fields">
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>

        <p className="login-credit">
          Powered by CapCom
          <br />
          from Flair Ltd
          <br />
          <a href="https://www.flair.london/">www.flair.london</a>
        </p>
      </div>
    </main>
  );
}
