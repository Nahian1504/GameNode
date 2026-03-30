import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../../services/axiosConfig";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage on app load
  useEffect(() => {
    const initAuth = () => {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Check token expiry by decoding JWT payload
          if (parsed.token) {
            const payload = JSON.parse(atob(parsed.token.split(".")[1]));
            if (payload.exp * 1000 < Date.now()) {
              localStorage.removeItem("authUser");
              setLoading(false);
              return;
            }
            setToken(parsed.token);
            setUser(parsed.user);
          }
        } catch {
          localStorage.removeItem("authUser");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register 
  const register = useCallback(async (username, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await API.post("/api/auth/register", {
        username,
        email,
        password,
      });

      const { token: newToken, user: newUser } = response.data;

      // Persist auth data
      localStorage.setItem(
        "authUser",
        JSON.stringify({ token: newToken, user: newUser })
      );
      setToken(newToken);
      setUser(newUser);
      setLoading(false);
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.data?.errors?.[0]) ||
        "Registration failed. Please try again.";
      setError(message);
      setLoading(false);
      return { success: false, message };
    }
  }, []);

  // Login 
  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await API.post("/api/auth/login", { email, password });

      const { token: newToken, user: newUser } = response.data;

      localStorage.setItem(
        "authUser",
        JSON.stringify({ token: newToken, user: newUser })
      );
      setToken(newToken);
      setUser(newUser);
      setLoading(false);
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Invalid email or password.";
      setError(message);
      setLoading(false);
      return { success: false, message };
    }
  }, []);

  // Logout 
  const logout = useCallback(() => {
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    register,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Use Auth must be used inside Auth Provider");
  }
  return context;
};

export default AuthContext;
