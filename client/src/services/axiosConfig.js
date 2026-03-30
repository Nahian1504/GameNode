import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Automatically attaches JWT token to every request
API.interceptors.request.use(
  (config) => {
    const authUser = localStorage.getItem("authUser");
    if (authUser) {
      try {
        const { token } = JSON.parse(authUser);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem("authUser");
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handles 401 (expired token) globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register") {
        localStorage.removeItem("authUser");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
