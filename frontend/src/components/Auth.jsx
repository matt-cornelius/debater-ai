import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Debater AI</h1>
      <div style={styles.card}>
        <h2 style={styles.heading}>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          style={styles.toggle}
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f5f5f5" },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: "#111" },
  card: { background: "#fff", borderRadius: 8, padding: 32, width: 360, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  heading: { fontSize: 18, fontWeight: 600, marginBottom: 20, color: "#111" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, outline: "none" },
  button: { padding: "10px 0", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  toggle: { marginTop: 16, background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", textDecoration: "underline" },
  error: { color: "#c00", fontSize: 13, margin: 0 },
  success: { color: "#060", fontSize: 13, margin: 0 },
};
