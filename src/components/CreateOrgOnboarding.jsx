import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useOrg } from "../context/OrgContext";
import toast from "react-hot-toast";

export default function CreateOrgOnboarding({ user, darkMode }) {
  const { refreshOrgData } = useOrg() || {};
  const defaultName = user?.email ? `${user.email.split('@')[0]}'s Organization` : "My Organization";
  const [orgName, setOrgName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  async function handleCreateOrg(e) {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error("Please enter an organization name.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Organization
      const { data: newOrg, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim() })
        .select()
        .single();

      if (orgErr) throw orgErr;

      // 2. Add current user as Owner (use upsert to handle DB trigger conflict gracefully)
      const { error: memErr } = await supabase
        .from("org_members")
        .upsert({
          org_id: newOrg.id,
          user_id: user.id,
          role: "owner"
        }, { onConflict: "org_id, user_id" });

      if (memErr && memErr.code !== "23505") throw memErr;

      toast.success("Organization created! Welcome to ASTRAV.");

      // 3. Refresh Org Context to activate the new workspace
      if (refreshOrgData) {
        await refreshOrgData();
      }
    } catch (err) {
      console.error("Failed to create organization:", err);
      toast.error(err.message || "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: darkMode ? "#0f172a" : "#f3f4f6",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        background: cardBg,
        borderRadius: "20px",
        border: `1px solid ${borderCol}`,
        padding: "36px",
        boxShadow: darkMode ? "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)" : "0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        animation: "fadeIn 0.35s ease",
      }}>
        {/* Brand Icon */}
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          background: "var(--gradient-brand, linear-gradient(135deg, #f15e1c, #fab60a))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          fontWeight: "800",
          color: "#ffffff",
          marginBottom: "20px",
          boxShadow: "0 6px 18px rgba(241,94,28,0.35)",
        }}>
          A
        </div>

        <h1 style={{
          fontSize: "24px",
          fontWeight: "800",
          letterSpacing: "-0.5px",
          margin: "0 0 8px",
          color: darkMode ? "#f8fafc" : "#0f172a",
        }}>
          Create your organization to get started
        </h1>

        <p style={{
          fontSize: "14px",
          color: textMuted,
          lineHeight: "1.5",
          margin: "0 0 28px",
        }}>
          Welcome to ASTRAV! Set up your organization to unlock your command center, goal tracking, department rollups, and AI productivity insights.
        </p>

        <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: darkMode ? "#cbd5e1" : "#475569",
              marginBottom: "8px",
            }}>
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
                background: darkMode ? "rgba(15,23,42,0.8)" : "#ffffff",
                color: darkMode ? "#f8fafc" : "#0f172a",
                fontSize: "14px",
                fontWeight: "500",
                outline: "none",
                transition: "all 0.15s ease",
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366f1";
                e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.18)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#cbd5e1";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "13px 20px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.18s ease",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px",
              fontFamily: "inherit",
            }}
          >
            {loading ? <span className="spinner" /> : "🚀"} Create Organization
          </button>
        </form>
      </div>
    </div>
  );
}
