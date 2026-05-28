import { useEffect, useState } from "react";
import { authFetch } from "../lib/supabase";

const TYPE_LABEL = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
};

export default function DocumentList({ refreshTrigger }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/api/documents");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [refreshTrigger]);

  async function handleDelete(id) {
    setDeleting(id);
    await authFetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  }

  if (loading) return <p style={styles.muted}>Loading documents…</p>;
  if (!docs.length) return <p style={styles.muted}>No documents yet. Upload one above.</p>;

  return (
    <ul style={styles.list}>
      {docs.map((doc) => (
        <li key={doc.id} style={styles.item}>
          <div style={styles.info}>
            <span style={styles.name}>{doc.filename}</span>
            <span style={styles.meta}>
              {TYPE_LABEL[doc.file_type] ?? doc.file_type} · {doc.chunk_count} chunks ·{" "}
              {new Date(doc.uploaded_at).toLocaleDateString()}
            </span>
          </div>
          <button
            style={styles.deleteBtn}
            onClick={() => handleDelete(doc.id)}
            disabled={deleting === doc.id}
          >
            {deleting === doc.id ? "…" : "Delete"}
          </button>
        </li>
      ))}
    </ul>
  );
}

const styles = {
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderRadius: 6, border: "1px solid #e5e5e5" },
  info: { display: "flex", flexDirection: "column", gap: 2 },
  name: { fontWeight: 500, fontSize: 14, color: "#111" },
  meta: { fontSize: 12, color: "#888" },
  deleteBtn: { background: "none", border: "1px solid #ddd", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#666", cursor: "pointer" },
  muted: { color: "#888", fontSize: 14 },
};
