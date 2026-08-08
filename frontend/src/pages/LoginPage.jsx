import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEMOS = [
  { label: "Priya (Ashoka manager)", email: "priya@ashoka.test" },
  { label: "Kavita (Ashoka HR)", email: "kavita.hr@ashoka.test" },
  { label: "Aisha (Ashoka employee)", email: "aisha@ashoka.test" },
  { label: "Ananya (Bright Path founder)", email: "ananya@brightpath.test" },
  { label: "Leela (Bright Path HR)", email: "hr@brightpath.test" },
  { label: "Omar (Bright Path employee)", email: "omar@brightpath.test" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === "HR" ? "/hr" : "/app/team");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <strong>Performance Evaluation Tool</strong>
            <span>Monthly Team Evaluations</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="sub">One unified app for all companies</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="demo-box">
          <strong>
            Demo accounts: Tap an account to auto-fill the email and password.
          </strong>
          <p className="muted" style={{ margin: "0.35rem 0 0.55rem" }}>
            Password for all accounts: <code>password123</code>
          </p>
          {DEMOS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
