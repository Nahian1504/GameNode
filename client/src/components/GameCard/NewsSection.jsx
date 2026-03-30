import React from "react";

const NewsSection = ({ news = [], loading = false, appId }) => {
  if (loading) {
    return (
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "12px" }}>Recent News</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: "68px", borderRadius: "var(--radius-md)" }} />)}
        </div>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>No recent news available for this game.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "12px" }}>
        Recent News
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {news.map((item) => (
          <a key={item.gid} href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textDecoration: "none", padding: "14px 16px", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", transition: "border-color var(--transition-fast)" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {item.title}
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {item.dateReadable && (
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{item.dateReadable}</span>
              )}
              {item.author && item.author !== "Unknown" && (
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>by {item.author}</span>
              )}
              <span style={{ fontSize: "0.72rem", color: "var(--color-accent-primary)", marginLeft: "auto" }}>Read ↗</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsSection;
