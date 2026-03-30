import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Providers
import { AuthProvider } from "./store/auth/authContext";
import { DashboardProvider } from "./store/dashboard/dashboardContext";

// Route guard 
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

// Pages 
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import SteamConnect from "./pages/Steam/SteamConnect";
import { NotFound, ServerError } from "./pages/ErrorPages";
import GameDetail from "./pages/Dashboard/GameDetail";       
import AchievementsPage from "./pages/Achievements/AchievementsPage"; 
import FavoritesPage from "./pages/Favorites/FavoritesPage"; 

// Global styles
import "./styles/global.css";

const App = () => {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            {/* Public Routes — no auth required*/}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/500" element={<ServerError />} />

            {/* Protected Routes — require valid JWT */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/steam/connect"
              element={
                <ProtectedRoute>
                  <SteamConnect />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/game/:appId" 
              element={
                <ProtectedRoute>
                  <GameDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/achievements/:appId" 
              element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
              } 
            />
            <Route 
              path="/favorites"           
              element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
              } 
            />
            
            {/* Redirects */}
            <Route 
              path="/" 
              element={
              <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="*" 
              element={
              <NotFound />
              } 
            />

          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
};

export default App;
