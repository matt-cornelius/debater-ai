import { useRef, useState } from "react";
import { authFetch } from "../lib/supabase";

const ACCEPTED = ".pdf,.docx,.txt";

export default function DocumentUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await authFetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Upload failed.");
      onUploaded(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div>
      <div
        style={{ ...styles.dropzone, ...(dragging ? styles.dragging : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <p style={styles.hint}>Processing…</p>
        ) : (
          <>
            <p style={styles.label}>Drop a file here or click to browse</p>
            <p style={styles.hint}>PDF, DOCX, or TXT — max 10 MB</p>
          </>
        )}
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  dropzone: { border: "2px dashed #ccc", borderRadius: 8, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: "#fafafa", transition: "border-color 0.15s, background 0.15s" },
  dragging: { borderColor: "#111", background: "#f0f0f0" },
  label: { margin: 0, fontWeight: 500, color: "#333" },
  hint: { margin: "6px 0 0", fontSize: 13, color: "#888" },
  error: { color: "#c00", fontSize: 13, marginTop: 8 },
};
