import { useEffect, useState } from "react";
import { supabase, authFetch } from "./lib/supabase";
import Auth from "./components/Auth";
import DocumentUpload from "./components/DocumentUpload";
import DocumentList from "./components/DocumentList";
import DebateList from "./components/DebateList";
import DebateCreate from "./components/DebateCreate";
import DebateView from "./components/DebateView";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState("corpus");

  // Corpus tab state
  const [uploadCount, setUploadCount] = useState(0);

  // Debates tab state
  const [debateView, setDebateView] = useState(null);   // full debate object being viewed
  const [creating, setCreating] = useState(false);
  const [debateRefresh, setDebateRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  async function handleSelectDebate(id) {
    const res = await authFetch(`/api/debates/${id}`);
    const data = await res.json();
    setDebateView(data);
  }

  function handleDebateCreated(debate) {
    setCreating(false);
    setDebateView(debate);
    setDebateRefresh((n) => n + 1);
  }

  if (session === undefined) return null;
  if (!session) return <Auth />;

  const userId = session.user.id;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Debater AI</h1>
        <nav style={styles.nav}>
          <button
            style={{ ...styles.tab, ...(tab === "corpus" ? styles.activeTab : {}) }}
            onClick={() => setTab("corpus")}
          >
            Corpus
          </button>
          <button
            style={{ ...styles.tab, ...(tab === "debates" ? styles.activeTab : {}) }}
            onClick={() => { setTab("debates"); setDebateView(null); setCreating(false); }}
          >
            Debates
          </button>
        </nav>
        <button style={styles.signout} onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <main style={styles.main}>
        {/* ── Corpus tab ── */}
        {tab === "corpus" && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Belief Corpus</h2>
            <p style={styles.sectionDesc}>
              Upload documents containing your opinions. Your AI agent argues from these.
            </p>
            <DocumentUpload onUploaded={() => setUploadCount((n) => n + 1)} />
            <div style={{ marginTop: 20 }}>
              <DocumentList refreshTrigger={uploadCount} />
            </div>
          </section>
        )}

        {/* ── Debates tab ── */}
        {tab === "debates" && (
          <>
            {debateView ? (
              <DebateView
                debate={debateView}
                currentUserId={userId}
                onBack={() => setDebateView(null)}
              />
            ) : creating ? (
              <DebateCreate
                onDebateCreated={handleDebateCreated}
                onCancel={() => setCreating(false)}
              />
            ) : (
              <DebateList
                currentUserId={userId}
                refreshTrigger={debateRefresh}
                onSelect={handleSelectDebate}
                onNew={() => setCreating(true)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" },
  header: { background: "#111", color: "#fff", padding: "14px 32px", display: "flex", alignItems: "center", gap: 24 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, marginRight: "auto" },
  nav: { display: "flex", gap: 4 },
  tab: { background: "none", border: "none", color: "#aaa", fontSize: 14, fontWeight: 500, padding: "6px 14px", borderRadius: 6, cursor: "pointer" },
  activeTab: { background: "rgba(255,255,255,0.15)", color: "#fff" },
  signout: { background: "none", border: "1px solid #555", color: "#ccc", borderRadius: 4, padding: "4px 12px", fontSize: 13, cursor: "pointer" },
  main: { maxWidth: 720, margin: "0 auto", padding: "32px 24px" },
  section: { background: "#fff", borderRadius: 8, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  sectionTitle: { margin: "0 0 6px", fontSize: 18, fontWeight: 600, color: "#111" },
  sectionDesc: { margin: "0 0 20px", fontSize: 14, color: "#666" },
};
