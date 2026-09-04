import { useOrg } from "../context/OrgContext";

export default function Billing({ darkMode }) {
  const { activeOrg, userRole, isOwner } = useOrg() || {};

  const cardBase = {
    padding: "24px",
    borderRadius: "16px",
    background: darkMode ? "#1E140C" : "#ffffff",
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
              color: darkMode ? "#FFF3E2" : "#2E2013",
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
              background: darkMode ? "rgba(241, 94, 28, 0.2)" : "#FFF3E2",
              color: darkMode ? "#f15e1c" : "#cf4a11",
              border: darkMode ? "1px solid rgba(241, 94, 28, 0.3)" : "1px solid #F0DFC9",
            }}
          >
            Pro Plan (Active)
          </span>
        </div>
        <p style={{ fontSize: "13px", color: darkMode ? "#9C8B76" : "#B3A18C", margin: 0 }}>
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
            borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E8D9C5",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: darkMode ? "#B3A18C" : "#9C8B76", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Current Plan
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              ASTRAV Enterprise / Scale
            </div>
            <div style={{ fontSize: "13px", color: darkMode ? "#B3A18C" : "#9C8B76", marginTop: "4px" }}>
              Organization: <strong style={{ color: darkMode ? "#E8D9C5" : "#1E140C" }}>{activeOrg?.name || "Command Center"}</strong>
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
              background: darkMode ? "rgba(255,255,255,0.03)" : "#FFF8EF",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #FFF3E2",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#9C8B76" : "#B3A18C", fontWeight: "700", textTransform: "uppercase" }}>
              Team Members
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF3E2" : "#2E2013", marginTop: "4px" }}>
              Unlimited Seat License
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: darkMode ? "rgba(255,255,255,0.03)" : "#FFF8EF",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #FFF3E2",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#9C8B76" : "#B3A18C", fontWeight: "700", textTransform: "uppercase" }}>
              AI Intelligence Model
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF3E2" : "#2E2013", marginTop: "4px" }}>
              Gemini 2.5 Flash Lite
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: darkMode ? "rgba(255,255,255,0.03)" : "#FFF8EF",
              border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #FFF3E2",
            }}
          >
            <div style={{ fontSize: "11px", color: darkMode ? "#9C8B76" : "#B3A18C", fontWeight: "700", textTransform: "uppercase" }}>
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
              background: "linear-gradient(135deg, #f15e1c, #cf4a11)",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "13px",
              cursor: isOwner ? "pointer" : "not-allowed",
              opacity: isOwner ? 1 : 0.6,
              boxShadow: "0 2px 10px rgba(241, 94, 28, 0.3)",
            }}
          >
            Manage Subscription (Stripe Portal)
          </button>
          <button
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid #D5C2A5",
              background: "transparent",
              color: darkMode ? "#E8D9C5" : "#4A3C2C",
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
