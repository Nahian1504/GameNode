import React, { useState, useEffect } from "react";
import API from "../../services/axiosConfig";

const RecommendationsSection = () => {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [genAt, setGenAt] = useState(null);

  useEffect(() => {
    fetchRecommendations(false);
  }, []);

  const fetchRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      let res;

      if (!forceRefresh) {
        try {
          res = await API.get("/api/recommendations/cached");
        } catch {
          res = await API.post("/api/recommendations", { forceRefresh: false });
        }
      } else {
        res = await API.post("/api/recommendations", { forceRefresh: true }); 
      }

      setRecs(res.data.recommendations);
      setSource(res.data.source);
      setGenAt(res.data.generatedAt);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("You have reached the recommendation limit for this hour. Please try again later.");
      } else {
        setError(err.response?.data?.message || "Failed to generate recommendations.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (pct) => {
    if (pct >= 85) return "var(--color-accent-success)";
    if (pct >= 70) return "var(--color-accent-secondary)";
    return "var(--color-accent-primary)";
  };

  return (
    <div style={{ marginTop: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            🎯 AI Recommendations
          </h2>
          {genAt && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              {source === "cache" ? "Cached · " : "Generated · "}
              {new Date(genAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchRecommendations(true)}
          disabled={loading}
          className="btn btn-secondary btn-sm"
        >
          {loading
            ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Generating...</>
            : recs ? "↺ Refresh" : "✨ Get Recommendations"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "16px" }}>
          <span>⚠</span> {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
              <div className="skeleton" style={{ height: "18px", width: "60%", marginBottom: "10px" }} />
              <div className="skeleton" style={{ height: "14px", width: "90%", marginBottom: "6px" }} />
              <div className="skeleton" style={{ height: "14px", width: "70%", marginBottom: "12px" }} />
              <div className="skeleton" style={{ height: "28px", width: "80px", borderRadius: "var(--radius-full)" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && !recs && !error && (
        <div style={{ padding: "32px", textAlign: "center", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎮</div>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "4px" }}>Discover games you will love</p>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>Click Get Recommendations and our AI will analyze your library to suggest the perfect next games.</p>
        </div>
      )}

      {!loading && recs && recs.length === 0 && (
        <div style={{ padding: "24px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>Connect your Steam account and play at least 3 games to get personalized recommendations.</p>
        </div>
      )}

      {!loading && recs && recs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {recs.map((rec, idx) => (
            <div key={idx} style={{
              background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)", padding: "20px",
              transition: "all var(--transition-base)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-glow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <h3 style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)", flex: 1, paddingRight: "8px" }}>
                  {rec.name}
                </h3>
                <span style={{
                  padding: "3px 10px", borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  background: `${getMatchColor(rec.matchPercent)}22`,
                  color: getMatchColor(rec.matchPercent),
                  border: `1px solid ${getMatchColor(rec.matchPercent)}55`,
                }}>
                  {rec.matchPercent}%
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "12px" }}>
                {rec.reason}
              </p>
              {rec.genre && (
                <span style={{ fontSize: "0.72rem", padding: "2px 8px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)" }}>
                  {rec.genre}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationsSection;
