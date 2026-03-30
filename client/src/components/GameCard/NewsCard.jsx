import React from "react";

const NewsCard = ({ article }) => {
  const { title, url, author, feedName, dateReadable, date } = article;

  const displayDate = dateReadable || (date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        padding: "16px",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        transition: "border-color var(--transition-fast)",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
      data-testid="news-card"
    >
      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px", lineHeight: 1.4 }}>
        {title}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {author && author !== "Unknown" && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            by {author}
          </span>
        )}
        {feedName && (
          <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", padding: "1px 6px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)" }}>
            {feedName}
          </span>
        )}
        {displayDate && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: "auto" }}>
            {displayDate}
          </span>
        )}
      </div>
      <p style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--color-accent-primary)" }}>
        Read on Steam ↗
      </p>
    </a>
  );
};

export default NewsCard;
