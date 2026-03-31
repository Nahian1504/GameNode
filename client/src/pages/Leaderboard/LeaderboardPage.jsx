import React, { useEffect, useState } from "react";
import Navbar from "../../components/Layout/Navbar";
import API from "../../services/axiosConfig";

const EMPTY_FORM = { playerName: "", game: "", score: "", notes: "", isPublic: false };

const LeaderboardPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortField, setSortField] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [filterGame, setFilterGame] = useState("");

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true); setError(null);
    try {
      const res = await API.get("/api/leaderboard");
      setEntries(res.data.entries || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leaderboard.");
    } finally { setLoading(false); }
  };

  const handleOpenAdd = () => { setEditEntry(null); setFormData(EMPTY_FORM); setFormError(null); setShowModal(true); };
  const handleOpenEdit = (entry) => { setEditEntry(entry); setFormData({ playerName: entry.playerName, game: entry.game, score: String(entry.score), notes: entry.notes || "", isPublic: entry.isPublic || false }); setFormError(null); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setEditEntry(null); setFormData(EMPTY_FORM); setFormError(null); };

  const handleSubmit = async () => {
    if (!formData.playerName.trim() || !formData.game.trim() || formData.score === "") {
      setFormError("Player name, game, and score are required."); return;
    }
    if (isNaN(Number(formData.score)) || Number(formData.score) < 0) {
      setFormError("Score must be a valid number 0 or greater."); return;
    }
    setSubmitting(true); setFormError(null);
    try {
      const payload = { ...formData, score: Number(formData.score) };
      if (editEntry) {
        await API.put(`/api/leaderboard/${editEntry._id}`, payload);
      } else {
        await API.post("/api/leaderboard", payload);
      }
      handleCloseModal();
      await fetchEntries();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save entry.");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leaderboard entry?")) return;
    try {
      await API.delete(`/api/leaderboard/${id}`);
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete entry.");
    }
  };

  const handleSort = (field) => {
    if (sortField === field) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
    else { setSortField(field); setSortDir("desc"); }
  };

  const uniqueGames = [...new Set(entries.map((e) => e.game))].sort();

  const sortedFiltered = [...entries]
    .filter((e) => !filterGame || e.game === filterGame)
    .sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const medal = (i) => ["🥇", "🥈", "🥉"][i] || null;

  return (
    <div className="page-container">
      <Navbar />
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container">

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>Leaderboard</h1>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>Track your scores and compete with friends</p>
            </div>
            <button onClick={handleOpenAdd} className="btn btn-primary">+ Add Entry</button>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: "24px" }}><span>⚠</span> {error}</div>}

          {/* Filter by game */}
          {uniqueGames.length > 0 && (
            <div style={{ marginBottom: "20px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Filter:</span>
              <button onClick={() => setFilterGame("")} className={`btn btn-sm ${!filterGame ? "btn-primary" : "btn-ghost"}`}>All</button>
              {uniqueGames.map((g) => (
                <button key={g} onClick={() => setFilterGame(g)} className={`btn btn-sm ${filterGame === g ? "btn-primary" : "btn-ghost"}`}>{g}</button>
              ))}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: "52px", borderRadius: "var(--radius-md)" }} />)}
            </div>
          ) : sortedFiltered.length === 0 ? (
            <EmptyLeaderboard onAdd={handleOpenAdd} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-bg-elevated)" }}>
                    {[{ key: "rank", label: "#" }, { key: "playerName", label: "Player" }, { key: "game", label: "Game" }, { key: "score", label: "Score" }, { key: "notes", label: "Notes" }].map((col) => (
                      <th key={col.key} onClick={() => col.key !== "rank" && handleSort(col.key)}
                        style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", cursor: col.key !== "rank" ? "pointer" : "default", userSelect: "none", border: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                        {col.label}{col.key !== "rank" && sortField === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </th>
                    ))}
                    <th style={{ padding: "12px 16px", border: "1px solid var(--color-border)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((entry, idx) => (
                    <tr key={entry._id} style={{ background: idx % 2 === 0 ? "var(--color-bg-card)" : "var(--color-bg-secondary)", transition: "background var(--transition-fast)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-bg-elevated)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "var(--color-bg-card)" : "var(--color-bg-secondary)"}>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)", fontSize: "1rem", textAlign: "center" }}>{medal(idx) || idx + 1}</td>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-primary)" }}>{entry.playerName}</td>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>{entry.game}</td>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", color: "var(--color-accent-primary)", fontWeight: 700 }}>{entry.score.toLocaleString()}</td>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{entry.notes || "—"}</td>
                      <td style={{ padding: "14px 16px", border: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleOpenEdit(entry)} className="btn btn-ghost btn-sm">Edit</button>
                          <button onClick={() => handleDelete(entry._id)} className="btn btn-danger btn-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add/Edit Modal */}
          {showModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "16px" }}
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
              <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "480px", animation: "slideUp 0.3s ease" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "24px" }}>
                  {editEntry ? "Edit Entry" : "Add Entry"}
                </h2>
                {formError && <div className="alert alert-error" style={{ marginBottom: "16px" }}><span>⚠</span> {formError}</div>}
                {[{ label: "Player Name", key: "playerName", placeholder: "e.g. YourUsername" },
                  { label: "Game", key: "game", placeholder: "e.g. Dota 2" },
                  { label: "Score", key: "score", placeholder: "e.g. 9500", type: "number" },
                  { label: "Notes", key: "notes", placeholder: "Optional notes" }].map((f) => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input type={f.type || "text"} className="form-input" placeholder={f.placeholder}
                      value={formData[f.key]} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
                  <input type="checkbox" id="isPublic" checked={formData.isPublic}
                    onChange={(e) => setFormData((p) => ({ ...p, isPublic: e.target.checked }))} />
                  <label htmlFor="isPublic" style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    Make this entry public (visible without login)
                  </label>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={handleCloseModal} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                    {submitting ? <><span className="spinner" /> Saving...</> : editEntry ? "Save Changes" : "Add Entry"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const EmptyLeaderboard = ({ onAdd }) => (
  <div style={{ textAlign: "center", padding: "64px 0" }}>
    <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.5 }}>🏅</div>
    <h3 style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }}>No entries yet</h3>
    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>Add your first leaderboard entry to start tracking scores.</p>
    <button onClick={onAdd} className="btn btn-primary">+ Add First Entry</button>
  </div>
);

export default LeaderboardPage;
