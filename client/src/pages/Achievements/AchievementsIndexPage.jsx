import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Layout/Navbar";
import { useDashboard } from "../../store/dashboard/dashboardContext";
import { useAuth } from "../../store/auth/authContext";
import { GameCardSkeleton } from "../../components/GameCard/GameCard";
import API from "../../services/axiosConfig";

const AchievementsIndexPage = () => {
  const { games, loading, fetchGames } = useDashboard();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [achievementGames, setAchievementGames] = useState([]); 
  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);

  useEffect(() => {
    if (user?.steamId && games.length === 0) {
      fetchGames(1);
    }
  }, [user?.steamId]);

  useEffect(() => {
    if (!games.length || !user?.steamId) return;

    const checkAchievements = async () => {
      setChecking(true);
      setCheckProgress(0); 
      setAchievementGames([]);

      const withAchievements = [];
      const gamesToCheck = games;

      try {
        for (let i = 0; i < gamesToCheck.length; i++) {
          const game = gamesToCheck[i];

          try {
            const res = await API.get(`/api/achievements/${game.appId}`);
            const summary = res.data.summary;

            if (summary?.total > 0) {
              withAchievements.push(game);
            }
          } catch {
            // Skip games where achievement fetch fails
          }

          // Update progress after each game
          setCheckProgress(Math.round(((i + 1) / gamesToCheck.length) * 100));

          // Small delay between requests to avoid rate limiting
          if (i < gamesToCheck.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }

        setAchievementGames(withAchievements);
      } finally {
        setChecking(false);
        setCheckProgress(0); 
      }
    };

    checkAchievements();
  }, [games]); 

  const isLoading = loading || checking;

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
            Achievements
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: "32px" }}>
            {achievementGames.length > 0
              ? `${achievementGames.length} games with achievements in progress`
              : checking
              ? "Scanning for games with achievements in progress..." 
              : "Games with incomplete achievements will appear here"}  
          </p>

          {!user?.steamId && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Connect your Steam account to view achievements.
              </p>
            </div>
          )}

          {checking && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  Scanning your library for achievements...
                </span>
                <span style={{ fontSize: "0.82rem", color: "var(--color-accent-primary)", fontFamily: "var(--font-mono)" }}>
                  {Math.min(checkProgress, 100)}%
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(checkProgress, 100)}%`,
                  background: "var(--color-accent-primary)",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.4s ease",
                }} />
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "6px" }}>
                This may take a moment — checking each game with Steam API
              </p>
            </div>
          )}

          {isLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)} 
            </div>
          )}

          {!isLoading && achievementGames.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
              {achievementGames.map((game) => (
                <div
                  key={game.appId}
                  onClick={() => navigate(`/achievements/${game.appId}`)}
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all var(--transition-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-glow)"; 
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none"; 
                  }}
                >
                  <img
                    src={game.headerImageUrl}
                    alt={game.name}
                    style={{ width: "100%", aspectRatio: "460/215", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {game.name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-accent-primary)" }}> 
                      🏆 View Achievements
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && user?.steamId && achievementGames.length === 0 && games.length > 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.4 }}>🏆</div>
              <p style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                No games with achievements in progress found.
              </p>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                This could mean all your games have no achievement system, your achievements are all complete, or your Steam achievement stats are set to private.
              </p>
            </div>
          )}

          {!isLoading && games.length === 0 && user?.steamId && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ color: "var(--color-text-secondary)" }}>No games found in your library.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AchievementsIndexPage;