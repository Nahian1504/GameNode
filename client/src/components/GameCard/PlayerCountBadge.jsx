import React from "react";

const PlayerCountBadge = ({ count, loading = false }) => {
  if (loading) {
    return <div className="skeleton" style={{ width: "140px", height: "52px", borderRadius: "var(--radius-sm)" }} />;
  }

  const formatted = typeof count === "number" ? count.toLocaleString() : "—";

  const getColor = () => {
    if (!count || count === 0) return "var(--color-text-muted)";
    if (count > 100000) return "var(--color-accent-success)";
    if (count > 10000) return "var(--color-accent-secondary)";
    return "var(--color-accent-primary)";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: getColor(), boxShadow: count > 0 ? `0 0 6px ${getColor()}` : "none" }} />
      <div>
        <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1px" }}>
          Players Online
        </p>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: getColor(), fontFamily: "var(--font-mono)" }}>
          {formatted}
        </p>
      </div>
    </div>
  );
};

export default PlayerCountBadge;
