export default function DebateView({ debate, currentUserId, onBack }) {
  const isChallenger = debate.challenger_id === currentUserId;

  return (
    <div style={styles.card}>
      <button style={styles.back} onClick={onBack}>← Back to debates</button>
      <h2 style={styles.topic}>{debate.topic}</h2>
      <p style={styles.meta}>
        {debate.challenger_email} challenged {debate.opponent_email}
      </p>

      <div style={styles.rounds}>
        {debate.rounds.map((round) => {
          const isMe = round.user_id === currentUserId;
          const label = round.round_type.charAt(0).toUpperCase() + round.round_type.slice(1);
          const email = round.user_id === debate.challenger_id
            ? debate.challenger_email
            : debate.opponent_email;

          return (
            <div key={round.id} style={{ ...styles.round, ...(isMe ? styles.myRound : styles.theirRound) }}>
              <div style={styles.roundHeader}>
                <span style={styles.roundLabel}>{label}</span>
                <span style={styles.roundUser}>{email}{isMe ? " (you)" : ""}</span>
              </div>
              <p style={styles.argument}>{round.argument}</p>
              {round.sources?.length > 0 && (
                <p style={styles.sources}>Sources: {round.sources.join(", ")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  card: { background: "#fff", borderRadius: 8, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  back: { background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 },
  topic: { margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#111" },
  meta: { margin: "0 0 24px", fontSize: 13, color: "#888" },
  rounds: { display: "flex", flexDirection: "column", gap: 16 },
  round: { borderRadius: 8, padding: 20, border: "1px solid #e5e5e5" },
  myRound: { background: "#f0f7ff", borderColor: "#c8dff7" },
  theirRound: { background: "#fafafa", borderColor: "#e5e5e5" },
  roundHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  roundLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#555" },
  roundUser: { fontSize: 12, color: "#888" },
  argument: { margin: "0 0 10px", fontSize: 14, lineHeight: 1.7, color: "#222", whiteSpace: "pre-wrap" },
  sources: { margin: 0, fontSize: 12, color: "#aaa", fontStyle: "italic" },
};
