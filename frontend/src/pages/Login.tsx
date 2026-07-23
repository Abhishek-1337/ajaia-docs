import { useState } from "react";
import { login, User } from "../api";

const SEED_USERS = [
  { email: "alice@example.com", name: "Alice", color: "#4A90D9" },
  { email: "bob@example.com", name: "Bob", color: "#50B86C" },
  { email: "carol@example.com", name: "Carol", color: "#E8744A" },
];

interface Props {
  onLogin: (name: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (email: string) => {
    setError("");
    setLoading(true);
    try {
      const user: User = await login(email);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name);
      onLogin(user.name);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Ajaia Docs</h1>
        <p className="login-subtitle">Choose a demo user to sign in</p>

        {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div className="seed-users-only">
          {SEED_USERS.map((u) => (
            <button
              key={u.email}
              className="seed-user-btn"
              onClick={() => handleLogin(u.email)}
              type="button"
              disabled={loading}
            >
              <span
                className="user-badge"
                style={{ background: u.color }}
              >
                {u.name[0]}
              </span>
              <span>
                {u.name} <span className="text-muted text-sm">({u.email})</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
