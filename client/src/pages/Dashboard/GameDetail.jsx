import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../../components/Layout/Navbar";
import API from "../../services/axiosConfig";

const GameDetail = () => {
  const { appId } = useParams();
  const navigate  = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!appId) return;
    const fetchGameDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await API.get(`/api/steam/game/${appId}`);
        setGame(response.data.game);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load game details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchGameDetail();
  }, [appId]);

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container" style={{ maxWidth: "960px" }}>

          <button onClick={() => navigate("/dashboard")}
            className="btn btn-ghost btn-sm" style={{ marginBottom: "24px" }}>
            ← Back to Library
          </button>

          {loading && <GameDetailSkeleton />}

          {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}

          {!loading && !error && game && (
            <div style={{ animation: "slideUp 0.4s ease" }}>

              {/* Header image */}
              <div style={{ width: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "32px" }}>
                <img src={game.headerImageUrl} alt={game.name || appId}
                  style={{ width: "100%", maxHeight: "300px", objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }} />
              </div>

              {/* Title + stats */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
                <div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    {game.name || `App ${appId}`}
                  </h1>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <StatBadge icon="⏱" label="Playtime"       value={`${game.playtimeHours}h`} />
                    <StatBadge icon="👥" label="Players Online" value={game.playerCount?.toLocaleString() || "—"} />
                    {game.achievements && (
                      <StatBadge icon="🏆" label="Achievements"
                        value={`${game.achievements.unlocked} / ${game.achievements.total}`} />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link to={`/achievements/${appId}`} className="btn btn-secondary btn-sm">
                    🏆 Achievements
                  </Link>
                  <a href={`https://store.steampowered.com/app/${appId}`}
                    target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    Steam Store ↗
                  </a>
                </div>
              </div>

              {/* Recent news */}
              {game.news && game.news.length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    Recent News
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {game.news.map((item) => (
                      <a key={item.gid} href={item.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: "block", textDecoration: "none", padding: "16px",
                          background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)", transition: "border-color var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                      >
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                          {item.title}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                          {new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · Read on Steam ↗
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {game.news && game.news.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", marginBottom: "32px" }}>
                  <p style={{ color: "var(--color-text-muted)" }}>No recent news for this game.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatBadge = ({ icon, label, value }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
    background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
  }}>
    <span style={{ fontSize: "0.85rem" }}>{icon}</span>
    <div>
      <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{value}</p>
    </div>
  </div>
);

const GameDetailSkeleton = () => (
  <div>
    <div className="skeleton" style={{ width: "100%", height: "300px", borderRadius: "var(--radius-lg)", marginBottom: "32px" }} />
    <div className="skeleton" style={{ width: "40%", height: "36px", marginBottom: "16px" }} />
    <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
      {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: "120px", height: "52px", borderRadius: "var(--radius-sm)" }} />)}
    </div>
  </div>
);

export default GameDetail;