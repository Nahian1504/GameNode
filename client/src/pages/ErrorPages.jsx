import React from "react";
import { Link } from "react-router-dom";

export const NotFound = () => (
  <div style={{
    minHeight: "100vh",
    background: "var(--color-bg-primary)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    textAlign: "center",
  }}>
    <div style={{
      fontFamily: "var(--font-display)",
      fontSize: "8rem",
      fontWeight: 700,
      color: "var(--color-bg-elevated)",
      lineHeight: 1,
      marginBottom: "16px",
      userSelect: "none",
    }}>
      404
    </div>
    <h1 style={{
      fontFamily: "var(--font-display)", fontSize: "2rem",
      fontWeight: 700, marginBottom: "12px",
    }}>
      Page Not Found
    </h1>
    <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
      This page doesn't exist or has been moved.
    </p>
    <Link to="/dashboard" className="btn btn-primary">
      Back to Dashboard
    </Link>
  </div>
);

export const ServerError = () => (
  <div style={{
    minHeight: "100vh",
    background: "var(--color-bg-primary)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    textAlign: "center",
  }}>
    <div style={{
      fontFamily: "var(--font-display)", fontSize: "8rem", fontWeight: 700,
      color: "var(--color-bg-elevated)", lineHeight: 1, marginBottom: "16px",
    }}>
      500
    </div>
    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "12px" }}>
      Server Error
    </h1>
    <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
      Something went wrong on our end. Please try again.
    </p>
    <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
  </div>
);
