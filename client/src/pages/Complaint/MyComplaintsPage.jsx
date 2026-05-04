import React, { useEffect, useState } from "react";
import Navbar from "../../components/Layout/Navbar";
import API from "../../services/axiosConfig";

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.4)",  text: "var(--color-accent-warning)", label: "Pending"   },
  resolved: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)",  text: "var(--color-accent-success)", label: "Resolved"  },
  escalated: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)",  text: "#ef4444", label: "Escalated" },
};

const MyComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await API.get("/api/complaints/mine");
        setComplaints(res.data.complaints || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load complaints.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            My Complaints
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: "32px" }}>
            Your complaint history and AI resolution suggestions
          </p>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "var(--radius-lg)" }} />)}
            </div>
          )}

          {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}

          {!loading && !error && complaints.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.4 }}>📭</div>
              <p style={{ color: "var(--color-text-secondary)" }}>You have not submitted any complaints yet.</p>
            </div>
          )}

          {!loading && complaints.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {complaints.map((c) => {
                const s = STATUS_COLORS[c.status] || STATUS_COLORS.pending;
                const isExpanded = expanded === c._id;
                return (
                  <div key={c._id} style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                    
                    <div
                      onClick={() => setExpanded(isExpanded ? null : c._id)}
                      style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "16px" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span style={{ padding: "2px 10px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-full)", fontSize: "0.72rem", color: s.text, fontWeight: 600 }}>
                            {s.label}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {c.category}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.description}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                          {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded AI response */}
                    {isExpanded && c.aiResponse && (
                      <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--color-border)" }}>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-accent-secondary)", fontWeight: 600, marginBottom: "8px", marginTop: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          🤖 AI Resolution Suggestion
                        </p>
                        <p style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.7 }}>
                          {c.aiResponse}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyComplaintsPage;
