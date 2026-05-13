export default function StatCard({ title, value, darkMode }) {
  return (
    <div
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = darkMode
          ? "0 8px 28px rgba(0,0,0,0.45)"
          : "0 8px 28px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = darkMode
          ? "0 2px 12px rgba(0,0,0,0.35)"
          : "0 2px 12px rgba(0,0,0,0.06)";
      }}
      style={{
        borderRadius: "14px",
        padding: "24px 20px",
        background: darkMode ? "#1e293b" : "#ffffff",
        color: darkMode ? "#f8fafc" : "#0f172a",
        boxShadow: darkMode
          ? "0 2px 12px rgba(0,0,0,0.35)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        minHeight: "130px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle accent blob */}
      <div
        style={{
          position: "absolute",
          top: "-18px",
          right: "-18px",
          width: "70px",
          height: "70px",
          borderRadius: "50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          fontSize: "12px",
          fontWeight: "600",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: darkMode ? "#64748b" : "#94a3b8",
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "30px",
          fontWeight: "700",
          margin: 0,
          letterSpacing: "-0.5px",
          color: darkMode ? "#f1f5f9" : "#0f172a",
        }}
      >
        {value}
      </p>
    </div>
  );
}