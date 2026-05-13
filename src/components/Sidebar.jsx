import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',  icon: '▤' },
  { to: '/goals',     label: 'Goals',      icon: '◎' },
  { to: '/tasks',     label: 'Tasks',      icon: '✓' },
  { to: '/projects',  label: 'Projects',   icon: '⬡' },
  { to: '/analytics', label: 'Analytics',  icon: '◈' },
];

export default function Sidebar({ darkMode }) {
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
  }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <div
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: darkMode ? '#0c1524' : '#111827',
        color: 'white',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        borderRight: darkMode ? '1px solid rgba(255,255,255,0.04)' : 'none',
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <div style={{ paddingLeft: '12px', marginBottom: '36px' }}>
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
}