import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth/authContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/dashboard", label: "Library", icon: "⊞" },
    { to: "/steam/connect", label: "Steam", icon: "🎮" },
  ];

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/dashboard" && location.pathname.startsWith(path));

  return (
    <nav style={{
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 24px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link to="/dashboard" style={{
          display: "flex", alignItems: "center", gap: "10px", textDecoration: "none",
        }}>
          <div style={{
            width: 30, height: 30,
            background: "var(--color-accent-primary)",
            borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "1rem",
          }}>G</div>
          <span style={{
            fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700,
            color: "var(--color-text-primary)", letterSpacing: "0.05em",
          }}>GameNode</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }} className="hide-mobile">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: location.pathname === link.to
                  ? "var(--color-accent-primary)"
                  : "var(--color-text-secondary)",
                background: location.pathname === link.to
                  ? "rgba(108, 99, 255, 0.1)"
                  : "transparent",
                textDecoration: "none",
                transition: "all var(--transition-fast)",
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "6px 12px",
              background: "var(--color-bg-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
            }}>
              <div style={{
                width: 28, height: 28,
                background: "var(--color-accent-primary)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", fontWeight: 700, color: "white",
              }}>
                {user.username?.[0]?.toUpperCase() || "U"}
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {user.username}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            title="Sign out"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
