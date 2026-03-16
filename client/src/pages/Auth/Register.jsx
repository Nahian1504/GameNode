import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../store/auth/authContext";

const registerSchema = Yup.object({
  username: Yup.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
    .required("Username is required"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[0-9]/, "Must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/, "Must contain at least one special character")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

const Register = () => {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const [serverError, setServerError] = useState(null);

  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: registerSchema,
    onSubmit: async (values, { setSubmitting }) => {
      clearError();
      setServerError(null);
      const result = await register(values.username, values.email, values.password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setServerError(result.message);
      }
      setSubmitting(false);
    },
  });

  const getInputClass = (fieldName) => {
    const hasError = formik.touched[fieldName] && formik.errors[fieldName];
    return `form-input${hasError ? " error" : ""}`;
  };

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
            Create Account
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px", fontSize: "0.9rem" }}>
            Join GameNode and connect your Steam library
          </p>

          {/* Server error alert */}
          {serverError && (
            <div className="alert alert-error">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                className={getInputClass("username")}
                placeholder="Choose a username"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.username}
                autoComplete="username"
              />
              {formik.touched.username && formik.errors.username && (
                <div className="form-error">
                  <span>✕</span> {formik.errors.username}
                </div>
              )}
            </div>

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
              <label className="form-label" htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Min 8 chars, number + special"
                className={getInputClass("password")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.password}
                autoComplete="new-password"
              />
              {formik.touched.password && formik.errors.password && (
                <div className="form-error">
                  <span>✕</span> {formik.errors.password}
                </div>
              )}
              {formik.values.password && (
                <PasswordStrength password={formik.values.password} />
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Repeat your password"
                className={getInputClass("confirmPassword")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.confirmPassword}
                autoComplete="new-password"
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <div className="form-error">
                  <span>✕</span> {formik.errors.confirmPassword}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={formik.isSubmitting || !formik.isValid && formik.submitCount > 0}
              style={{ marginTop: "8px", padding: "14px" }}
            >
              {formik.isSubmitting ? (
                <><span className="spinner" /> Creating account...</>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="divider">or</div>

          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--color-accent-primary)", fontWeight: 600 }}>
              Sign in
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

const PasswordStrength = ({ password }) => {
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    if (pwd.length >= 12) score++;
    return score;
  };

  const strength = getStrength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["", "#ff4d6d", "#ffd166", "#ffd166", "#06d6a0", "#4ecdc4"];

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background: i <= strength ? colors[strength] : "var(--color-border)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      {strength > 0 && (
        <p style={{ fontSize: "0.75rem", color: colors[strength] }}>
          {labels[strength]}
        </p>
      )}
    </div>
  );
};

const Logo = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
    <div style={{
      width: 36,
      height: 36,
      background: "var(--color-accent-primary)",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: "1.2rem",
      color: "white",
    }}>G</div>
    <span style={{
      fontFamily: "var(--font-display)",
      fontSize: "1.4rem",
      fontWeight: 700,
      color: "var(--color-text-primary)",
      letterSpacing: "0.05em",
    }}>GameNode</span>
  </div>
);

const AuthHeroContent = () => (
  <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
    <div style={{
      fontSize: "5rem",
      marginBottom: "24px",
      filter: "drop-shadow(0 0 30px rgba(108,99,255,0.5))",
    }}>🎮</div>
    <h2 style={{
      fontFamily: "var(--font-display)",
      fontSize: "2.5rem",
      fontWeight: 700,
      color: "var(--color-text-primary)",
      marginBottom: "16px",
      lineHeight: 1.2,
    }}>
      Your Gaming<br />
      <span style={{ color: "var(--color-accent-primary)" }}>Command Center</span>
    </h2>
    <p style={{
      color: "var(--color-text-secondary)",
      fontSize: "1rem",
      lineHeight: 1.7,
      maxWidth: "360px",
    }}>
      Connect your Steam library, track achievements, and discover new games — all in one place.
    </p>
    <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "40px", flexWrap: "wrap" }}>
      {["Steam Integration", "Game Dashboard", "Tournaments"].map((feat) => (
        <span key={feat} className="badge badge-purple">{feat}</span>
      ))}
    </div>
  </div>
);

export default Register;
