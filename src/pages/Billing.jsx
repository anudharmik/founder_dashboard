import { useOrg } from "../context/OrgContext";

export default function Billing({ darkMode }) {
  const { activeOrg, userRole, isOwner } = useOrg() || {};

  const cardBase = {
    padding: "24px",
    borderRadius: "16px",
    background: darkMode ? "#1e293b" : "#ffffff",
    boxShadow: darkMode ? "0 2px 16px rgba(0,0,0,0.4)" : "0 2px 16px rgba(0,0,0,0.06)",
    border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
        animation: "fadeIn 0.35s ease",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 5vw, 28px)",
              fontWeight: "800",
              margin: 0,
              letterSpacing: "-0.6px",
              color: darkMode ? "#f1f5f9" : "#0f172a",
            }}
          >
            Billing & Subscription
          </h1>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "6px",
              background: darkMode ? "rgba(99,102,241,0.2)" : "#e0e7ff",
              color: darkMode ? "#818cf8" : "#4338ca",
              border: darkMode ? "1px solid rgba(99,102,241,0.3)" : "1px solid #c7d2fe",
            }}
          >
            Pro Plan (Active)
          </span>
        </div>
        <p style={{ fontSize: "13px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
          Manage your organization subscription plan and billing details
        </p>
      </div>

      {/* Main Billing Card */}
      <div style={{ ...cardBase, marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: darkMode ? "#94a3b8" : "#64748b", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Current Plan
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
              Founder OS Enterprise / Scale
            </div>
            <div style={{ fontSize: "13px", color: darkMode ? "#94a3b8" : "#64748b", marginTop: "4px" }}>
              Organization: <strong style={{ color: darkMode ? "#e2e8f0" : "#1e293b" }}>{activeOrg?.name || "Command Center"}</strong>
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: darkMode ? "#22c55e" : "#15803d",
                background: darkMode ? "rgba(34,197,94,0.12)" : "#dcfce7",
                padding: "6px 12px",
                borderRadius: "8px",
                border: darkMode ? "1px solid rgba(34,197,94,0.25)" : "1px solid #bbf7d0",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
              Billed Annually ($99/mo)
            </span>
          </div>
        </div>

        {/* Plan Highlights */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#64748b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              Team Members
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#f1f5f9" : "#0f172a", marginTop: "4px" }}>
              Unlimited Seat License
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#64748b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              AI Intelligence Model
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#f1f5f9" : "#0f172a", marginTop: "4px" }}>
              Gemini 2.5 Flash Lite
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#64748b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
              Rollup Engine Sync
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#22c55e" : "#16a34a", marginTop: "4px" }}>
              Realtime Active
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            disabled={!isOwner}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "13px",
              cursor: isOwner ? "pointer" : "not-allowed",
              opacity: isOwner ? 1 : 0.6,
              boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
            }}
          >
            Manage Subscription (Stripe Portal)
          </button>
          <button
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
              background: "transparent",
              color: darkMode ? "#e2e8f0" : "#334155",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Download Latest Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
