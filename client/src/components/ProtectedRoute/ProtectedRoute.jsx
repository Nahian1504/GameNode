import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth/authContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Shows spinner while checking auth state on initial load
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#0f0f1a",
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "3px solid #1a1a2e",
          borderTop: "3px solid #6c63ff",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Saves where user was going so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
