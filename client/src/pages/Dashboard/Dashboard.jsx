import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  const handleGameClick = (appId) => navigate(`/game/${appId}`);

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFavorite = (appId) => favorites.some((f) => f.appId === appId);

  return (
    <div className="page-container">
      <Navbar />

      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container">

          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
          }}>
            <div>
              <h1>Game Library</h1>
              <p>
                {user?.steamId
                  ? `${pagination.total} games · ${totalPlaytimeHours}h total playtime`
                  : "Connect your Steam account"}
              </p>
            </div>

            {user?.steamId && (
              <button onClick={handleRefresh} disabled={loading || isRefreshing}>
                {isRefreshing ? "Syncing..." : "↺ Refresh"}
              </button>
            )}
          </div>

          {!user?.steamId && <NoSteamCard />}

          {/* Search + Sort */}
          {user?.steamId && !loading && (
            <div style={{ marginBottom: "24px" }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div>
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setSortBy(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div>
              {Array.from({ length: 12 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Games */}
          {!loading && filteredGames.length > 0 && (
            <>
              <div>
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

              {pagination.totalPages > 1 && (
                <Pagination
                  current={pagination.page}
                  total={pagination.totalPages}
                  onChange={handlePageChange}
                />
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

const NoSteamCard = () => (
  <div>
    <h2>Connect Steam</h2>
    <Link to="/steam/connect">Connect</Link>
  </div>
);

const Pagination = ({ current, total, onChange }) => (
  <div>
    <button onClick={() => onChange(current - 1)}>Prev</button>
    <span>{current} / {total}</span>
    <button onClick={() => onChange(current + 1)}>Next</button>
  </div>
);

export default Dashboard;