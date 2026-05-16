import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',  icon: '▤' },
  { to: '/goals',     label: 'Goals',      icon: '◎' },
  { to: '/tasks',     label: 'Tasks',      icon: '✓' },
  { to: '/projects',  label: 'Projects',   icon: '⬡' },
  { to: '/analytics', label: 'Analytics',  icon: '◈' },
];

/**
 * Sidebar — works in two modes:
 *  • Desktop (≥768px): sticky panel, always visible, no overlay needed.
 *  • Mobile (<768px):  fixed drawer that slides in from the left.
 *                      Controlled by `isOpen` / `onClose` props.
 */
export default function Sidebar({ darkMode, isOpen, onClose }) {
  const location = useLocation();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isOpen]);

  // Close drawer on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await supabase.auth.signOut();
  }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const sidebarContent = (
    <div
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100%',
        background: darkMode ? '#0c1524' : '#111827',
        color: 'white',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        borderRight: darkMode ? '1px solid rgba(255,255,255,0.04)' : 'none',
      }}
    >
      {/* Brand + mobile close button */}
      <div style={{ paddingLeft: '12px', marginBottom: '36px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '800',
              letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              lineHeight: 1,
            }}
          >
            Founder OS
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>
            Your command center
          </p>
        </div>

        {/* Close button — only shows on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '2px 8px',
              lineHeight: 1.4,
              display: 'none', // hidden on desktop via media query override below
            }}
            className="sidebar-close-btn"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
                fontWeight: active ? '600' : '400',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: active
                  ? darkMode
                    ? 'rgba(99,102,241,0.18)'
                    : 'rgba(99,102,241,0.22)'
                  : 'transparent',
                borderLeft: active ? '3px solid #818cf8' : '3px solid transparent',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                }
              }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(239,68,68,0.3)',
          cursor: 'pointer',
          background: 'transparent',
          color: '#f87171',
          fontWeight: '600',
          fontSize: '14px',
          width: '100%',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
        }}
      >
        ↪ Logout
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible, sticky) ── */}
      <div
        className="sidebar-desktop"
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          zIndex: 100,
          display: 'none', // overridden by inline media-query style below
        }}
      >
        {sidebarContent}
      </div>

      {/* ── Mobile overlay backdrop ── */}
      <div
        className={`sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ── */}
      <div
        className="sidebar-mobile"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 200,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'none', // overridden below
        }}
      >
        {sidebarContent}
      </div>

      {/* Inline responsive rules — avoids Tailwind dependency */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar-desktop { display: block !important; }
          .sidebar-mobile  { display: none !important; }
          .sidebar-overlay { display: none !important; }
          .mobile-topbar   { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile  { display: block !important; }
          .sidebar-close-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}