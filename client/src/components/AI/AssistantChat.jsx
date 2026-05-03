import React, { useState, useRef, useEffect } from "react";
import API from "../../services/axiosConfig";

const AssistantChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Build session history from messages for API
  const getSessionHistory = () =>
    messages.map((m) => ({ role: m.role, content: m.content }));

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    if (trimmed.length > 300) { setError("Message cannot exceed 300 characters."); return; }

    setError(null);
    const userMsg = { role: "user", content: trimmed, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await API.post("/api/assistant", {
        message: trimmed,
        sessionHistory: getSessionHistory(),
      });
      const assistantMsg = { role: "assistant", content: res.data.response, id: Date.now() + 1 };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("You have reached the hourly message limit. Please try again later.");
      } else {
        const assistantMsg = {
          role: "assistant",
          content: err.response?.data?.message || "I am having trouble responding right now. Please try again.",
          id: Date.now() + 1,
          isError: true,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 200,
      width: "380px", maxWidth: "calc(100vw - 48px)",
      background: "var(--color-bg-card)", border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-xl)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", height: "520px",
      animation: "slideUp 0.3s ease",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🤖</div>
          <div>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)" }}>Gaming Assistant</p>
            <p style={{ fontSize: "0.72rem", color: "var(--color-accent-success)" }}>● Online</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🎮</p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Ask me anything about your games!</p>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>Tips, strategies, achievement guides — I am here to help.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "10px 14px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? "var(--color-accent-primary)" : msg.isError ? "rgba(239,68,68,0.15)" : "var(--color-bg-elevated)",
              border: msg.role !== "user" ? `1px solid ${msg.isError ? "rgba(239,68,68,0.3)" : "var(--color-border)"}` : "none",
              color: msg.role === "user" ? "white" : "var(--color-text-primary)",
              fontSize: "0.875rem", lineHeight: 1.6,
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 16px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: "4px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-muted)", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "8px 16px", background: "rgba(239,68,68,0.1)", borderTop: "1px solid rgba(239,68,68,0.2)", fontSize: "0.78rem", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", display: "flex", gap: "8px", flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your games... (Enter to send)"
          rows={1}
          style={{
            flex: 1, background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
            color: "var(--color-text-primary)", padding: "10px 14px",
            fontSize: "0.875rem", resize: "none", outline: "none",
            fontFamily: "var(--font-body)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            width: 40, height: 40, flexShrink: 0,
            background: input.trim() && !isTyping ? "var(--color-accent-primary)" : "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
            color: input.trim() && !isTyping ? "white" : "var(--color-text-muted)",
            cursor: input.trim() && !isTyping ? "pointer" : "default",
            fontSize: "1rem", transition: "all var(--transition-fast)",
          }}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
    </div>
  );
};

export default AssistantChat;
