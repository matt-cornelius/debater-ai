import { useState } from "react";
import { authFetch } from "../lib/supabase";

export default function DebateCreate({ onDebateCreated, onCancel }) {
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [opponent, setOpponent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    setOpponent(null);
    if (val.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await authFetch(`/api/users/search?q=${encodeURIComponent(val)}`);
      setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!opponent) { setError("Select an opponent first."); return; }
    setError(null);
    setCreating(true);
    try {
      const res = await authFetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, opponent_id: opponent.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to create debate.");
      onDebateCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>New Debate</h3>
      <form onSubmit={handleCreate} style={styles.form}>
        <label style={styles.label}>Debate topic</label>
        <input
          style={styles.input}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Universal basic income should be implemented"
          required
        />

        <label style={styles.label}>Opponent (search by email)</label>
        <input
          style={styles.input}
          value={query}
          onChange={handleSearch}
          placeholder="Search users…"
          autoComplete="off"
        />

        {results.length > 0 && !opponent && (
          <ul style={styles.results}>
            {results.map((u) => (
              <li
                key={u.id}
                style={styles.resultItem}
                onClick={() => { setOpponent(u); setQuery(u.email); setResults([]); }}
              >
                {u.email}
              </li>
            ))}
          </ul>
        )}

        {searching && <p style={styles.hint}>Searching…</p>}

        {opponent && (
          <p style={styles.selected}>
            Debating against: <strong>{opponent.email}</strong>
            <button type="button" style={styles.clearBtn} onClick={() => { setOpponent(null); setQuery(""); }}>
              ×
            </button>
          </p>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button style={styles.submitBtn} type="submit" disabled={creating || !opponent}>
            {creating ? "Generating debate…" : "Start debate"}
          </button>
        </div>

        {creating && (
          <p style={styles.hint}>Both agents are generating arguments — this takes 10–20 seconds…</p>
        )}
      </form>
    </div>
  );
}

const styles = {
  card: { background: "#fff", borderRadius: 8, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  heading: { margin: "0 0 20px", fontSize: 18, fontWeight: 600 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 13, fontWeight: 500, color: "#444" },
  input: { padding: "9px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  results: { listStyle: "none", padding: 0, margin: 0, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" },
  resultItem: { padding: "10px 12px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #f0f0f0", background: "#fff" },
  selected: { margin: 0, fontSize: 14, color: "#333", display: "flex", alignItems: "center", gap: 8 },
  clearBtn: { background: "none", border: "none", color: "#888", fontSize: 16, cursor: "pointer", padding: "0 4px" },
  actions: { display: "flex", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: "9px 0", background: "#fff", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, cursor: "pointer" },
  submitBtn: { flex: 2, padding: "9px 0", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  hint: { margin: 0, fontSize: 13, color: "#888", fontStyle: "italic" },
  error: { margin: 0, color: "#c00", fontSize: 13 },
};
