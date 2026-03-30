import React, { useState } from "react";

const GameCard = ({ game, onClick, isFavorite = false, onToggleFavorite }) => {
  const { appId, name, playtimeHours, headerImageUrl } = game;
  const [imgError, setImgError] = useState(false);

  // Format playtime
  const formatPlaytime = (hours) => {
    if (!hours || hours === 0) return "Not played";
    if (hours < 1) return `${Math.round(hours * 60)}m played`;
    if (hours < 100) return `${hours.toFixed(1)}h played`;
    return `${Math.round(hours)}h played`;
  };

  // Steam store URL
  const storeUrl = `https://store.steampowered.com/app/${appId}`;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "all var(--transition-base)",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(108,99,255,0.4)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-glow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(appId); }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          style={{
            position: "absolute", top: "8px", right: "8px", zIndex: 10,
            background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
            width: "28px", height: "28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "0.9rem",
            color: isFavorite ? "var(--color-accent-warning)" : "white",
            transition: "all var(--transition-fast)",
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      )}

      {/* Game header image */}
      <div style={{ width: "100%", aspectRatio: "460/215", background: "var(--color-bg-elevated)", overflow: "hidden" }}>
        {!imgError && headerImageUrl ? (
          <img src={headerImageUrl} alt={name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <GamePlaceholder name={name} />
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "16px" }}>
        <h3 style={{
          fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 600,
          color: "var(--color-text-primary)", marginBottom: "8px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }} title={name}>{name}</h3>

 HEAD

        {/* Playtime */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: "0.78rem",
            color: playtimeHours > 0 ? "var(--color-accent-secondary)" : "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
          }}>
            {formatPlaytime(playtimeHours)}
          </span>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: "0.72rem", color: "var(--color-text-muted)",
              textDecoration: "none", padding: "3px 8px",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-primary)"; e.currentTarget.style.color = "var(--color-accent-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >Store ↗</a>
        </div>
      </div>
    </div>
  );
};

const GamePlaceholder = ({ name }) => (
  <div style={{
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-secondary))",
    gap: "8px",
  }}>
    <span style={{ fontSize: "2rem", opacity: 0.5 }}>🎮</span>
    <span style={{
      fontSize: "0.72rem", color: "var(--color-text-muted)",
      textAlign: "center", padding: "0 12px",
      overflow: "hidden", textOverflow: "ellipsis",
      whiteSpace: "nowrap", maxWidth: "90%",
    }}>{name}</span>
  </div>
);

export const GameCardSkeleton = () => (
  <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
    <div className="skeleton" style={{ width: "100%", aspectRatio: "460/215" }} />
    <div style={{ padding: "16px" }}>
      <div className="skeleton" style={{ height: "16px", width: "70%", marginBottom: "10px" }} />
      <div className="skeleton" style={{ height: "12px", width: "40%" }} />
    </div>
  </div>
);

export default GameCard;
