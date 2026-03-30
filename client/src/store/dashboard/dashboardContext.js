import React, { createContext, useContext, useState, useCallback } from "react";
import API from "../../services/axiosConfig";

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({page: 1, totalPages: 1, total: 0 });
  const [totalPlaytimeHours, setTotalPlaytimeHours] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);


  // Fetch dashboard games 
  const fetchGames = useCallback(async (page = 1, sort = "playtime") => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(
        `/api/steam/dashboard?page=${page}&limit=12&sort=${sort}`
      );
      const { games: gameList, total, totalPages, totalPlaytimeHours: tph } = response.data;
      setGames(gameList);
      setPagination({ page, total, totalPages });
      setTotalPlaytimeHours(tph || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load your game library. Please try again.");
    } finally {
      setLoading(false);
    }
  }, 
  []);

  // Force refresh 
  const refreshGames = useCallback(async () => {
    try {
      await API.post("/api/steam/sync");
      await fetchGames(1);
    } catch (err) {
      setError("Refresh failed. Please try again.");
    }
  }, [fetchGames]);

  const clearError = useCallback(() => setError(null), []);

  const fetchFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const response = await API.get("/api/favorites");
      setFavorites(response.data.favorites || []);
    } catch {
    } finally {
      setFavoritesLoading(false);
    }
  }, 
  []);
 
  const toggleFavorite = useCallback(async (appId) => {
    const isFav = favorites.some((f) => f.appId === appId);
    try {
      if (isFav) {
        await API.delete(`/api/favorites/${appId}`);
        setFavorites((prev) => prev.filter((f) => f.appId !== appId));
      } else {
        const response = await API.post("/api/favorites", { appId });
        setFavorites((prev) => [...prev, response.data.favorite]);
      }
    } catch (err) {
      console.error("Toggle favorite failed:", err);
    }
  }, [favorites]);
 
  return (
    <DashboardContext.Provider value={{
      games, loading, error, pagination,
      totalPlaytimeHours,
      fetchGames, refreshGames, clearError,
      favorites, favoritesLoading, fetchFavorites, toggleFavorite,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
 
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside DashboardProvider");
  return context;
};