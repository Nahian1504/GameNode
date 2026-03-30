import React, { createContext, useContext, useState, useCallback } from "react";
import API from "../../services/axiosConfig";

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Fetch dashboard games 
  const fetchGames = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/api/steam/dashboard?page=${page}&limit=12`);
      const { games: gameList, total, totalPages } = response.data;

      setGames(gameList);
      setPagination({ page, total, totalPages });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to load your game library. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <DashboardContext.Provider
      value={{
        games,
        loading,
        error,
        pagination,
        fetchGames,
        refreshGames,
        clearError,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("Use Dashboard must be used inside Dashboard Provider");
  }
  return context;
};
