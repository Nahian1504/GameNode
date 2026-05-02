import React, { useState } from "react";
import API from "../../services/axiosConfig";
import { COMPLAINT_CATEGORIES } from "../../constants/complaint";

const ComplaintModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState("form"); 
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    if (!category) { setFormError("Please select a category."); return; }
    if (description.trim().length < 10) { setFormError("Description must be at least 10 characters."); return; }
    if (description.trim().length > 500) { setFormError("Description exceeded the 500 characters limit."); return; }

    setSubmitting(true);
    try {
      const res = await API.post("/api/complaints", { category, description: description.trim() });
      setComplaint(res.data.complaint);
      setStep("response");
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (status) => {
    setUpdating(true);
    try {
      await API.patch(`/api/complaints/${complaint._id}/status`, { status });
      setStatusMsg(status === "resolved"
        ? "Great! We are glad the suggestion helped."
        : "Your complaint has been escalated. Our team will follow up.");
    } catch {
      setStatusMsg("Status update failed. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setStep("form"); setCategory(""); setDescription("");
    setFormError(null); setComplaint(null); setStatusMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "32px", width: "100%", maxWidth: "520px", animation: "slideUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
              {step === "form" ? "Submit a Complaint" : "AI Resolution Suggestion"}
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              {step === "form" ? "Tell us what went wrong and our AI will suggest a resolution." : "Here is what our AI recommends for your issue."}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.2rem", padding: "4px" }}>✕</button>
        </div>

        {/* FORM */}
        {step === "form" && (
          <>
            {formError && (
              <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                <span>⚠</span> {formError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="complaint-category">Category</label>
              <select
                id="complaint-category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="">Select a category...</option>
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="complaint-description">
                Description
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: "8px" }}>
                  ({description.length}/500)
                </span>
              </label>
              <textarea
                id="complaint-description"
                className="form-input"
                placeholder="Describe your issue in detail (minimum 10 characters)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ resize: "vertical", minHeight: "100px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button onClick={handleClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Getting AI Help...</> : "Submit Complaint"}
              </button>
            </div>
          </>
        )}

        {/* RESPONSE */}
        {step === "response" && complaint && (
          <>
            <div style={{ display: "inline-block", padding: "4px 12px", background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "var(--radius-full)", fontSize: "0.75rem", color: "var(--color-accent-primary)", marginBottom: "16px" }}>
              {complaint.category}
            </div>

            {/* AI Response */}
            <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-accent-secondary)", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🤖 AI Suggested Resolution
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--color-text-primary)", lineHeight: 1.7 }}>
                {complaint.aiResponse}
              </p>
            </div>

            {/* Status message */}
            {statusMsg ? (
              <div style={{ padding: "16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "var(--radius-md)", marginBottom: "16px", fontSize: "0.875rem", color: "var(--color-accent-success)" }}>
                {statusMsg}
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                Did this resolve your issue?
              </p>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              {!statusMsg && (
                <>
                  <button onClick={() => handleStatus("resolved")} disabled={updating} className="btn btn-primary" style={{ flex: 1 }}>
                    ✓ Yes, Resolved
                  </button>
                  <button onClick={() => handleStatus("escalated")} disabled={updating} className="btn btn-ghost" style={{ flex: 1 }}>
                    ↑ Still Need Help
                  </button>
                </>
              )}
              {statusMsg && (
                <button onClick={handleClose} className="btn btn-primary" style={{ flex: 1 }}>Close</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComplaintModal;
