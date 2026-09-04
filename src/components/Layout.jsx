import { useState } from "react";
import Sidebar from "./Sidebar";
import "../App.css";

/**
 * Layout — top-level shell for all authenticated pages.
 *
 * On desktop (≥768px):
 *   Left sticky sidebar | Right scrollable main content
 *
 * On mobile (<768px):
 *   Full-width topbar with hamburger → opens sidebar drawer
 */
export default function Layout({ children, darkMode, onOpenReminders }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topbarBg  = darkMode ? "#0c1524"  : "#2E2013";
  const contentBg = "transparent";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: contentBg }}>
      {/* Sidebar (handles both desktop sticky + mobile drawer internally) */}
      <Sidebar
        darkMode={darkMode}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenReminders={onOpenReminders}
      />

      {/* Right-hand column: topbar (mobile) + page content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* ── Mobile topbar ── */}
        <div
          className="mobile-topbar"
          style={{
            display: "flex",         /* hidden on desktop via .mobile-topbar rule in Sidebar.jsx */
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            background: topbarBg,
            borderBottom: darkMode
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(0,0,0,0.08)",
            position: "sticky",
            top: 0,
            zIndex: 150,
            flexShrink: 0,
          }}
        >
          {/* Hamburger button */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              fontSize: "20px",
              padding: "6px 10px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ☰
          </button>

          {/* Brand name in topbar */}
          <span
            style={{
              fontSize: "16px",
              fontWeight: "800",
              background: "linear-gradient(135deg, #f15e1c, #fab60a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ASTRAV
          </span>
        </div>

        {/* ── Page content ── */}
        <div
          style={{
            padding: "20px 16px",       /* mobile default */
            flex: 1,
            minWidth: 0,
            overflowX: "hidden",
          }}
          className="layout-content"
        >
          {children}
        </div>
      </div>

      {/* Responsive padding upgrade for larger screens */}
      <style>{`
        @media (min-width: 640px) {
          .layout-content { padding: 28px 28px !important; }
        }
        @media (min-width: 1024px) {
          .layout-content { padding: 32px 36px !important; }
        }
      `}</style>
    </div>
  );
}