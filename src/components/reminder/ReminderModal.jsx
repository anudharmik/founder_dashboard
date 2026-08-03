import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useOrg } from "../../context/OrgContext";

export default function ReminderModal({ isOpen, onClose, user, darkMode }) {
  const { activeOrg } = useOrg() || {};
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen && user && activeOrg?.id) {
      fetchReminders();
    }
  }, [isOpen, user, activeOrg?.id]);

  async function fetchReminders() {
    if (!activeOrg?.id) return;
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("org_id", activeOrg.id)
      .eq("user_id", user.id)
      .order("remind_at", { ascending: true });

    if (!error) {
      setReminders(data || []);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !remindAt) {
      setErrorMsg("Title and Date/Time are required.");
      return;
    }

    if (!activeOrg?.id) {
      setErrorMsg("No active organization selected.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase
      .from("reminders")
      .insert({
        org_id: activeOrg.id,
        user_id: user.id,
        title,
        description,
        remind_at: new Date(remindAt).toISOString(),
        sent: false,
      });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Reminder scheduled successfully!");
      setTitle("");
      setDescription("");
      setRemindAt("");
      fetchReminders();
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMsg("Failed to delete reminder.");
    } else {
      fetchReminders();
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
      boxSizing: "border-box",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        background: darkMode ? "#1e293b" : "#ffffff",
        border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "500px",
        maxHeight: "90vh",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: darkMode ? "#f1f5f9" : "#0f172a",
              letterSpacing: "-0.3px"
            }}>Manage Reminders</h2>
            <p style={{
              margin: "2px 0 0",
              fontSize: "12px",
              color: darkMode ? "#64748b" : "#94a3b8"
            }}>Schedule automatic email alerts via Resend</p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: darkMode ? "#94a3b8" : "#64748b",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >✕</button>
        </div>

        {/* Content Body */}
        <div style={{
          padding: "24px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }}>
          {errorMsg && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px"
            }}>⚠️ {errorMsg}</div>
          )}

          {successMsg && (
            <div style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#4ade80",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px"
            }}>✅ {successMsg}</div>
          )}

          {/* Create form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: darkMode ? "#94a3b8" : "#64748b" }}>
                Reminder Title
              </label>
              <input
                type="text"
                placeholder="e.g. Prep deck for pitch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
                  background: darkMode ? "#0f172a" : "#f8fafc",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: darkMode ? "#94a3b8" : "#64748b" }}>
                Description
              </label>
              <textarea
                placeholder="Add more details (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
                  background: darkMode ? "#0f172a" : "#f8fafc",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: darkMode ? "#94a3b8" : "#64748b" }}>
                Remind At
              </label>
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
                  background: darkMode ? "#0f172a" : "#f8fafc",
                  color: darkMode ? "#f1f5f9" : "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "6px",
                padding: "11px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                fontFamily: "inherit",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {loading ? "Scheduling..." : "Schedule Email Reminder"}
            </button>
          </form>

          {/* List of active reminders */}
          <div>
            <h3 style={{
              margin: "0 0 12px",
              fontSize: "14px",
              fontWeight: "700",
              color: darkMode ? "#f1f5f9" : "#0f172a"
            }}>Upcoming Reminders ({reminders.length})</h3>

            {reminders.length === 0 ? (
              <div style={{
                padding: "24px",
                textAlign: "center",
                background: darkMode ? "rgba(255,255,255,0.02)" : "#f8fafc",
                borderRadius: "12px",
                border: darkMode ? "1px dashed rgba(255,255,255,0.08)" : "1px dashed #cbd5e1",
                fontSize: "13px",
                color: darkMode ? "#64748b" : "#94a3b8"
              }}>No upcoming reminders set.</div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "200px",
                overflowY: "auto",
                paddingRight: "4px"
              }}>
                {reminders.map((rem) => {
                  const dateStr = new Date(rem.remind_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div 
                      key={rem.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                        border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, marginRight: "12px" }}>
                        <div style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: darkMode ? "#f1f5f9" : "#0f172a",
                          textDecoration: rem.sent ? "line-through" : "none",
                          opacity: rem.sent ? 0.5 : 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>{rem.title}</div>
                        <div style={{
                          fontSize: "11px",
                          color: rem.sent ? "#22c55e" : darkMode ? "#64748b" : "#94a3b8",
                          marginTop: "2px"
                        }}>{rem.sent ? "✅ Sent" : `⏰ ${dateStr}`}</div>
                      </div>
                      <button
                        onClick={() => handleDelete(rem.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: "14px",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "4px",
                          transition: "background 0.15s ease"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >🗑️</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}