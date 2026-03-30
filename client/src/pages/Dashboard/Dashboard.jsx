import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/auth/authContext";
import { useDashboard } from "../../store/dashboard/dashboardContext";
import Navbar from "../../components/Layout/Navbar";
import GameCard, { GameCardSkeleton } from "../../components/GameCard/GameCard";

const SORT_OPTIONS = [
  { value: "playtime", label: "Most Played" },
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Recently Played" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    games, loading, error, pagination,
    totalPlaytimeHours, fetchGames, refreshGames, clearError,
    favorites, fetchFavorites, toggleFavorite,
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("playtime");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.steamId) {
      fetchGames(1, sortBy);
      fetchFavorites();
    }
  }, [user?.steamId, fetchGames, fetchFavorites, sortBy]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchGames(newPage, sortBy);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshGames();
    setIsRefreshing(false);
  };

  // Game details
  const handleGameClick = (appId) => navigate(`/game/${appId}`);

  // Client-side search filter
  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFavorite = (appId) => favorites.some((f) => f.appId === appId);

  return (
    <div className="page-container">
      <Navbar />

      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container">

          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
          }}>
            <div>
              <h1 style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: "4px",
              }}>
                Game Library
              </h1>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                {user?.steamId
                  ? `${pagination.total} games · ${totalPlaytimeHours}h total playtime`
                  : "Connect your Steam account to see your library"}
              </p>
            </div>
            
            {user?.steamId && (
              <button
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className="btn btn-ghost btn-sm"
              >
                {isRefreshing ? (
                  <><span className="spinner" style={{ width: 14, height: 14 }} /> Syncing...</>
                ) : (
                  "↺ Refresh"
                )}
              </button>
            )}
          </div>
          

          {!user?.steamId && (
            <NoSteamCard />
          )}

          {/* Error State */}
          {error && user?.steamId && (
            <div className="alert alert-error" style={{ marginBottom: "24px" }}>
              <span>⚠</span>
              <div>
                <strong>Failed to load games</strong>
                <p style={{ marginTop: "4px", fontSize: "0.85rem" }}>{error}</p>
              </div>
              <button
                onClick={clearError}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
              >✕</button>
            </div>
          )}

          {user?.steamId && !loading && games.length > 0 && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" className="form-input"
                placeholder="Search your games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: "300px" }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`btn btn-sm ${sortBy === opt.value ? "btn-primary" : "btn-ghost"}`}
                    style={{ fontSize: "0.78rem" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && user?.steamId && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && filteredGames.length > 0 && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "20px",
                animation: "fadeIn 0.4s ease",
              }}>
                {filteredGames.map((game) => (
                  <GameCard
                    key={game.appId}
                    game={game}
                    onClick={() => handleGameClick(game.appId)}
                    isFavorite={isFavorite(game.appId)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && !searchQuery && (
                <Pagination
                  current={pagination.page}
                  total={pagination.totalPages}
                  onChange={handlePageChange}
                />
              )}
            </>
          )}

          {/* Empty search result */}
          {!loading && searchQuery && filteredGames.length === 0 && games.length > 0 && (
            <EmptySearch query={searchQuery} onClear={() => setSearchQuery("")} />
          )}

          {/* No games in library */}
          {!loading && !error && games.length === 0 && user?.steamId && (
            <EmptyLibrary />
          )}
        </div>
      </main>
    </div>
  );
};

// Sub-components
const NoSteamCard = () => (
  <div style={{
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "64px 32px",
    textAlign: "center",
    maxWidth: "520px",
    margin: "0 auto",
  }}>
    <div style={{ fontSize: "4rem", marginBottom: "24px" }}>🎮</div>
    <h2 style={{
      fontFamily: "var(--font-display)",
      fontSize: "1.6rem",
      fontWeight: 700,
      color: "var(--color-text-primary)",
      marginBottom: "12px",
    }}>
      Connect Your Steam Account
    </h2>
    <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px", lineHeight: 1.7 }}>
      Link your Steam account to view your game library, track playtime, and get personalized recommendations.
    </p>
    <Link to="/steam/connect" className="btn btn-primary">
      Connect Steam →
    </Link>
  </div>
);

const EmptyLibrary = () => (
  <div style={{ textAlign: "center", padding: "64px 0" }}>
    <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.5 }}>📦</div>
    <h3 style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }}>
      No games found
    </h3>
    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
      Your Steam library appears to be empty or private.
    </p>
  </div>
);

const EmptySearch = ({ query, onClear }) => (
  <div style={{ textAlign: "center", padding: "48px 0" }}>
    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</div>
    <p style={{ color: "var(--color-text-secondary)" }}>
      No games match <strong>"{query}"</strong>
    </p>
    <button onClick={onClear} className="btn btn-ghost btn-sm" style={{ marginTop: "16px" }}>
      Clear search
    </button>
  </div>
);

const Pagination = ({ current, total, onChange }) => {
  const pages = [];

  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  for (let i = start; i <= end; i++) pages.push(i);

  const btnStyle = (active) => ({
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    border: active ? "none" : "1px solid var(--color-border)",
    background: active ? "var(--color-accent-primary)" : "transparent",
    color: active ? "white" : "var(--color-text-secondary)",
    cursor: active ? "default" : "pointer",
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 400,
    transition: "all var(--transition-fast)",
  });

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      marginTop: "40px",
    }}>
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        style={{ ...btnStyle(false), opacity: current === 1 ? 0.3 : 1 }}
      >
        ‹
      </button>

      {start > 1 && <>
        <button onClick={() => onChange(1)} style={btnStyle(false)}>1</button>
        {start > 2 && <span style={{ color: "var(--color-text-muted)" }}>…</span>}
      </>}

      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} style={btnStyle(p === current)}>
          {p}
        </button>
      ))}

      {end < total && <>
        {end < total - 1 && <span style={{ color: "var(--color-text-muted)" }}>…</span>}
        <button onClick={() => onChange(total)} style={btnStyle(false)}>{total}</button>
      </>}

      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        style={{ ...btnStyle(false), opacity: current === total ? 0.3 : 1 }}
      >
        ›
      </button>
    </div>
  );
};

export default Dashboard;
