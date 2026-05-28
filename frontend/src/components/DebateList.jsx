import { useEffect, useState } from "react";
import { authFetch } from "../lib/supabase";

export default function DebateList({ currentUserId, refreshTrigger, onSelect, onNew }) {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch("/api/debates")
      .then((r) => r.json())
      .then((data) => setDebates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Debates</h2>
        <button style={styles.newBtn} onClick={onNew}>+ New debate</button>
      </div>

      {loading && <p style={styles.muted}>Loading…</p>}

      {!loading && debates.length === 0 && (
        <p style={styles.muted}>No debates yet. Challenge someone to start.</p>
      )}

      {!loading && debates.length > 0 && (
        <ul style={styles.list}>
          {debates.map((d) => {
            const isChallenger = d.challenger_id === currentUserId;
            const opponent = isChallenger ? d.opponent_email : d.challenger_email;
            const role = isChallenger ? "You challenged" : "Challenged by";
            return (
              <li key={d.id} style={styles.item} onClick={() => onSelect(d.id)}>
                <p style={styles.topic}>{d.topic}</p>
                <p style={styles.meta}>
                  {role} <strong>{opponent}</strong> ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const styles = {
  wrapper: { background: "#fff", borderRadius: 8, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  heading: { margin: 0, fontSize: 18, fontWeight: 600 },
  newBtn: { padding: "7px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: { padding: "14px 16px", border: "1px solid #e5e5e5", borderRadius: 6, cursor: "pointer" },
  topic: { margin: "0 0 4px", fontWeight: 500, fontSize: 14, color: "#111" },
  meta: { margin: 0, fontSize: 12, color: "#888" },
  muted: { color: "#888", fontSize: 14 },
};
