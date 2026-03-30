import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Layout/Navbar";
import { useDashboard } from "../../store/dashboard/dashboardContext";

const SORT_OPTIONS = [
  { value: "added", label: "Recently Added" },
  { value: "playtime", label: "Most Played" },
  { value: "name", label: "Name A–Z" },
];

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favorites, favoritesLoading, fetchFavorites, toggleFavorite } = useDashboard();
  const [sortBy, setSortBy] = useState("added");

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const sorted = [...favorites].sort((a, b) => {
    if (sortBy === "playtime") return (b.playtimeHours || 0) - (a.playtimeHours || 0);
    if (sortBy === "name")  return (a.name || "").localeCompare(b.name || "");
    return new Date(b.addedAt) - new Date(a.addedAt); 
  });

  const formatPlaytime = (h) => {
    if (!h || h === 0) return "Not played";
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 100) return `${h.toFixed(1)}h`;
    return `${Math.round(h)}h`;
  };

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container">

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                Favorites
              </h1>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                {favorites.length} {favorites.length === 1 ? "game" : "games"} saved
              </p>
            </div>

            {favorites.length > 0 && (
              <div style={{ display: "flex", gap: "6px" }}>
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)}
                    className={`btn btn-sm ${sortBy === opt.value ? "btn-primary" : "btn-ghost"}`}
                    style={{ fontSize: "0.78rem" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {favoritesLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
              {Array.from({ length: 6 }).map((_, i) => <FavSkeleton key={i} />)}
            </div>
          )}

          {!favoritesLoading && sorted.length === 0 && <EmptyFavorites />}

          {!favoritesLoading && sorted.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", animation: "fadeIn 0.4s ease" }}>
              {sorted.map((game) => (
                <FavoriteCard
                  key={game.appId}
                  game={game}
                  onRemove={() => toggleFavorite(game.appId)}
                  onClick={() => navigate(`/game/${game.appId}`)}
                  formatPlaytime={formatPlaytime}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const FavoriteCard = ({ game, onRemove, onClick, formatPlaytime }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div onClick={onClick} style={{
      background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)", overflow: "hidden",
      cursor: "pointer", position: "relative",
      transition: "all var(--transition-base)",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove from favorites"
        style={{ position: "absolute", top: "8px", right: "8px", zIndex: 10, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-accent-warning)", fontSize: "0.9rem" }}>
        ★
      </button>

      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "460/215", background: "var(--color-bg-elevated)", overflow: "hidden" }}>
        {!imgErr && game.headerImageUrl ? (
          <img src={game.headerImageUrl} alt={game.name || game.appId}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-elevated)" }}>
            <span style={{ fontSize: "2rem", opacity: 0.4 }}>🎮</span>
          </div>
        )}
      </div>

      <div style={{ padding: "14px" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {game.name || `App ${game.appId}`}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: game.playtimeHours > 0 ? "var(--color-accent-secondary)" : "var(--color-text-muted)" }}>
            {formatPlaytime(game.playtimeHours)}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            Added {new Date(game.addedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

const EmptyFavorites = () => (
  <div style={{ textAlign: "center", padding: "80px 32px" }}>
    <div style={{ fontSize: "4rem", marginBottom: "16px" }}>★</div>
    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "12px" }}>
      No Favorites Yet
    </h2>
    <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
      Star games on your dashboard to save them here for quick access.
    </p>
  </div>
);

const FavSkeleton = () => (
  <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
    <div className="skeleton" style={{ width: "100%", aspectRatio: "460/215" }} />
    <div style={{ padding: "14px" }}>
      <div className="skeleton" style={{ height: "14px", width: "70%", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "12px", width: "40%" }} />
    </div>
  </div>
);

export default FavoritesPage;
