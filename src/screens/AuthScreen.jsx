import { useState } from "react";
import { api, auth } from "../lib/api";
import GlobalStyles from "../components/GlobalStyles";
import { ErrorBox } from "../components/UI";

export default function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError("Email and password required"); return; }
    if (mode === "signup" && password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const result = mode === "login"
        ? await api.login(email.trim(), password)
        : await api.signup(email.trim(), password, name.trim() || undefined);
      auth.set(result.token);
      onSignedIn(result.user);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", background: "#f5f1ea" }}>
      <GlobalStyles />
      <div style={{ padding: "64px 24px 24px" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6e", marginBottom: 4 }}>
          SeatCheck
        </div>
        <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1.02, margin: "8px 0 8px", letterSpacing: -1.2 }}>
          {mode === "login"
            ? <>Welcome<br/><em style={{ fontStyle: "italic", color: "#6d5d47" }}>back.</em></>
            : <>Track every<br/><em style={{ fontStyle: "italic", color: "#6d5d47" }}>seat.</em></>}
        </h1>
        <p style={{ fontSize: 15, color: "#5c5247", margin: "12px 0 32px", maxWidth: 420, lineHeight: 1.5 }}>
          {mode === "login"
            ? "Sign in to see your saved seats and children."
            : "Create an account to save seats, track expiration, and get recall alerts."}
        </p>

        <form onSubmit={submit}>
          {error && <ErrorBox message={error} />}

          {mode === "signup" && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                     autoComplete="name" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                   placeholder="you@example.com" autoComplete="email"
                   autoCapitalize="none" autoCorrect="off"
                   style={inputStyle} required />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                   placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                   autoComplete={mode === "login" ? "current-password" : "new-password"}
                   style={inputStyle} required />
          </div>

          <button type="submit" disabled={busy} style={{
            width: "100%", padding: 14, borderRadius: 12,
            background: busy ? "#8a7e6e" : "#1a1917", color: "#f5f1ea",
            fontSize: 15, fontWeight: 500, letterSpacing: 0.2,
            opacity: busy ? 0.6 : 1
          }}>
            {busy ? "..." : (mode === "login" ? "Sign in" : "Create account")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
                  style={{ fontSize: 14, color: "#6d5d47", textDecoration: "underline" }}>
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button onClick={() => onSignedIn(null)} style={{ fontSize: 13, color: "#8a7e6e" }}>
            Continue without an account →
          </button>
          <div style={{ fontSize: 11, color: "#8a7e6e", marginTop: 6, lineHeight: 1.4, padding: "0 20px" }}>
            You can browse the catalog, but saved seats and children won't sync across devices.
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: "#6d5d47", marginBottom: 6, display: "block" };
const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: "1px solid #e3dcc9", fontSize: 15, background: "#fff",
  outline: "none"
};
