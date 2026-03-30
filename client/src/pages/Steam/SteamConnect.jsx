import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../store/auth/authContext";
import API from "../../services/axiosConfig";
import Navbar from "../../components/Layout/Navbar";

const steamSchema = Yup.object({
  steamId: Yup.string()
    .matches(/^\d{17}$/, "Steam ID must be exactly 17 digits")
    .required("Steam ID is required"),
});

const SteamConnect = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Already connected
  if (user?.steamId) {
    return (
      <div className="page-container">
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 24px" }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✓</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "8px" }}>
              Steam Already Connected
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }}>
              Your Steam ID: <code style={{
                fontFamily: "var(--font-mono)", fontSize: "0.85rem",
                background: "var(--color-bg-elevated)", padding: "2px 8px",
                borderRadius: "4px", color: "var(--color-accent-secondary)"
              }}>{user.steamId}</code>
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn-primary"
              style={{ marginTop: "24px" }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formik = useFormik({
    initialValues: { steamId: "" },
    validationSchema: steamSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      setSuccess(null);
      try {
        const response = await API.post("/api/steam/connect", { steamId: values.steamId });
        setSuccess(response.data);
        setTimeout(() => navigate("/dashboard"), 2500);
      } catch (err) {
        setServerError(err.response?.data?.message || "Failed to connect Steam account.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="page-container">
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 24px" }}>
        <div style={{ maxWidth: "560px", width: "100%", animation: "slideUp 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🎮</div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "2rem",
              fontWeight: 700, marginBottom: "12px",
            }}>
              Connect Steam Account
            </h1>
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              Link your Steam account to import your game library and track your gaming activity.
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="alert alert-success" style={{ marginBottom: "24px" }}>
              <span>✓</span>
              <div>
                <strong>Steam account connected!</strong>
                <p style={{ marginTop: "4px", fontSize: "0.85rem" }}>
                  Welcome, {success.steamProfile?.personaName}! Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: "24px" }}>
              <span>⚠</span> {serverError}
            </div>
          )}

          <div className="card">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "20px" }}>
              Enter Your Steam ID
            </h3>

            <form onSubmit={formik.handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="steamId">Steam ID (17 digits)</label>
                <input
                  id="steamId"
                  name="steamId"
                  type="text"
                  className={`form-input${formik.touched.steamId && formik.errors.steamId ? " error" : ""}`}
                  placeholder="76561198000000000"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.steamId}
                  maxLength={17}
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                {formik.touched.steamId && formik.errors.steamId && (
                  <div className="form-error"><span>✕</span> {formik.errors.steamId}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={formik.isSubmitting}
                style={{ padding: "14px" }}
              >
                {formik.isSubmitting ? (
                  <><span className="spinner" /> Validating Steam ID...</>
                ) : (
                  "Connect Steam Account"
                )}
              </button>
            </form>
          </div>

          <div className="card" style={{ marginTop: "20px" }}>
            <h4 style={{
              fontSize: "0.875rem", fontWeight: 600,
              color: "var(--color-text-secondary)", marginBottom: "16px",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              How to find your Steam ID
            </h4>
            <ol style={{
              paddingLeft: "20px", color: "var(--color-text-secondary)",
              fontSize: "0.875rem", lineHeight: 2,
            }}>
              <li>Open <strong style={{ color: "var(--color-text-primary)" }}>Steam</strong> and click your username</li>
              <li>Select <strong style={{ color: "var(--color-text-primary)" }}>Profile</strong> from the dropdown</li>
              <li>Click <strong style={{ color: "var(--color-text-primary)" }}>Edit Profile</strong>, then <strong style={{ color: "var(--color-text-primary)" }}>General</strong></li>
              <li>Your Steam ID appears in the URL:
                <code style={{
                  display: "block", marginTop: "6px",
                  fontFamily: "var(--font-mono)", fontSize: "0.8rem",
                  background: "var(--color-bg-elevated)", padding: "8px 12px",
                  borderRadius: "var(--radius-sm)", color: "var(--color-accent-secondary)",
                }}>
                  steamcommunity.com/profiles/<span style={{ color: "var(--color-accent-primary)" }}>76561198XXXXXXXXX</span>
                </code>
              </li>
            </ol>
            <div className="alert alert-info" style={{ marginTop: "16px", marginBottom: 0 }}>
              <span>ℹ</span> Your Steam profile must be set to <strong>Public</strong> for GameNode to access your library.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SteamConnect;
