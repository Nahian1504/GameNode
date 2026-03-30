import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Layout/Navbar";
import API from "../../services/axiosConfig";

const AchievementsPage = () => {
  const { appId } = useParams();
  const navigate  = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!appId) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await API.get(`/api/achievements/${appId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load achievements.");
      } finally { setLoading(false); }
    })();
  }, [appId]);

  const filtered = data?.achievements?.filter((a) => {
    if (filter === "unlocked") return a.achieved;
    if (filter === "locked") return !a.achieved;
    return true;
  }) || [];

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container" style={{ maxWidth: "960px" }}>
          <button onClick={() => navigate(`/game/${appId}`)} className="btn btn-ghost btn-sm" style={{ marginBottom: "24px" }}>
            ← Back to Game
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
            Achievements
          </h1>
          {loading && <AchievementsSkeleton />}
          {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
          {!loading && !error && data && (
            <>
              <ProgressSection summary={data.summary} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {[
                  { key: "all", label: `All (${data.summary.total})` },
                  { key: "unlocked", label: `Unlocked (${data.summary.unlocked})` },
                  { key: "locked", label: `Locked (${data.summary.locked})` },
                ].map((tab) => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)}
                    className={`btn btn-sm ${filter === tab.key ? "btn-primary" : "btn-ghost"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {filtered.length > 0
                ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                    {filtered.map((a) => <AchievementCard key={a.apiName} achievement={a} />)}
                  </div>
                : <EmptyState filter={filter} />
              }
            </>
          )}
        </div>
      </main>
    </div>
  );
};

const ProgressSection = ({ summary }) => (
  <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", marginBottom: "28px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
      <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>Progress</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--color-accent-primary)", fontWeight: 600 }}>
        {summary.unlocked} / {summary.total}
      </span>
    </div>
    <div style={{ width: "100%", height: "8px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${summary.percent}%`, background: summary.percent === 100 ? "var(--color-accent-success)" : "var(--color-accent-primary)", borderRadius: "var(--radius-full)", transition: "width 0.6s ease" }} />
    </div>
    <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--color-text-muted)", textAlign: "right" }}>{summary.percent}% complete</p>
  </div>
);

const AchievementCard = ({ achievement }) => {
  const { displayName, description, achieved, unlockTime, globalPercent, iconUrl, iconUrlGray } = achievement;
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "14px", background: "var(--color-bg-card)", border: `1px solid ${achieved ? "rgba(108,99,255,0.3)" : "var(--color-border)"}`, borderRadius: "var(--radius-md)", opacity: achieved ? 1 : 0.65 }}>
      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--color-bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {(achieved ? iconUrl : iconUrlGray) ? <img src={achieved ? iconUrl : iconUrlGray} alt={displayName} style={{ width: "100%", height: "100%" }} /> : <span style={{ fontSize: "1.5rem" }}>{achieved ? "🏆" : "🔒"}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
        {description && <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>{description}</p>}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {achieved && unlockTime > 0 && <span style={{ fontSize: "0.72rem", color: "var(--color-accent-success)" }}>✓ {new Date(unlockTime * 1000).toLocaleDateString()}</span>}
          {globalPercent !== null && <span style={{ fontSize: "0.72rem", color: globalPercent < 5 ? "var(--color-accent-warning)" : "var(--color-text-muted)" }}>{globalPercent < 5 ? "⭐ Rare · " : ""}{globalPercent}% of players</span>}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ filter }) => (
  <div style={{ textAlign: "center", padding: "48px 0" }}>
    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{filter === "unlocked" ? "🔓" : "🔒"}</div>
    <p style={{ color: "var(--color-text-secondary)" }}>
      {filter === "unlocked" ? "No achievements unlocked yet. Keep playing!" : "All achievements unlocked! Congratulations!"}
    </p>
  </div>
);

const AchievementsSkeleton = () => (
  <div>
    <div className="skeleton" style={{ height: "100px", borderRadius: "var(--radius-lg)", marginBottom: "28px" }} />
    <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
      {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: "120px", height: "32px", borderRadius: "var(--radius-sm)" }} />)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "var(--radius-md)" }} />)}
    </div>
  </div>
);

export default AchievementsPage;
