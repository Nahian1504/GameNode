import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../store/auth/authContext";

const loginSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .required("Password is required"),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError, isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Show registration success message if redirected from register
  const successMessage = location.state?.message;

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      clearError();
      setServerError(null);
      const result = await login(values.email, values.password);
      if (result.success) {
        // Redirect to where user was going, or dashboard
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      } else {
        setServerError(result.message);
      }
      setSubmitting(false);
    },
  });

  const getInputClass = (field) =>
    `form-input${formik.touched[field] && formik.errors[field] ? " error" : ""}`;

  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <AuthHeroContent />
      </div>

      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <Logo />
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginBottom: "8px",
          }}>
            Welcome Back
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
            Sign in to continue to your dashboard
          </p>

          {/* Success message from registration */}
          {successMessage && (
            <div className="alert alert-success">
              <span>✓</span> {successMessage}
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="alert alert-error">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className={getInputClass("email")}
                placeholder="your@email.com"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
                autoComplete="email"
              />
              {formik.touched.email && formik.errors.email && (
                <div className="form-error">
                  <span>✕</span> {formik.errors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Enter your password"
                className={getInputClass("password")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
                autoComplete="current-password"
              />
              {formik.touched.password && formik.errors.password && (
                <div className="form-error">
                  <span>✕</span> {formik.errors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={formik.isSubmitting}
              style={{ marginTop: "8px", padding: "14px" }}
            >
              {formik.isSubmitting ? (
                <><span className="spinner" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="divider">or</div>

          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--color-accent-primary)", fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const PasswordInput = ({ className, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        {...props}
        type={show ? "text" : "password"}
        className={className}
        style={{ paddingRight: "48px" }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "0.85rem",
          padding: "4px",
        }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
};

const Logo = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
    <div style={{
      width: 36, height: 36,
      background: "var(--color-accent-primary)",
      borderRadius: "8px",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "white",
    }}>G</div>
    <span style={{
      fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700,
      color: "var(--color-text-primary)", letterSpacing: "0.05em",
    }}>GameNode</span>
  </div>
);

const AuthHeroContent = () => (
  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
    <div style={{ fontSize: "5rem", marginBottom: "24px", filter: "drop-shadow(0 0 30px rgba(108,99,255,0.5))" }}>
      🕹️
    </div>
    <h2 style={{
      fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700,
      color: "var(--color-text-primary)", marginBottom: "16px", lineHeight: 1.2,
    }}>
      Back in the<br />
      <span style={{ color: "var(--color-accent-secondary)" }}>Game</span>
    </h2>
    <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "360px" }}>
      Your Steam library, achievements, and leaderboards are waiting for you.
    </p>
    <StatsRow />
  </div>
);

const StatsRow = () => (
  <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "48px" }}>
    {[
      { value: "500+", label: "Games Tracked" },
      { value: "100%", label: "Secure" },
      { value: "Live", label: "Player Counts" },
    ].map((stat) => (
      <div key={stat.label} style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700,
          color: "var(--color-accent-primary)",
        }}>{stat.value}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {stat.label}
        </div>
      </div>
    ))}
  </div>
);

export default Login;
