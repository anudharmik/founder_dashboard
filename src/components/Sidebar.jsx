import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOrg } from '../context/OrgContext';

const NAV_ITEMS = [
  {
    to: '/', label: 'Dashboard', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    to: '/departments', label: 'Departments', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    )
  },
  {
    to: '/teams', label: 'Teams', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    to: '/projects', label: 'Projects', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    )
  },
  {
    to: '/goals', label: 'Goals', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    )
  },
  {
    to: '/tasks', label: 'Tasks', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    )
  },
  {
    to: '/analytics', label: 'Analytics', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    )
  },
  {
    to: '/settings/org', label: 'Org Settings', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  },
];

export default function Sidebar({ darkMode, isOpen, onClose, onOpenReminders }) {
  const location = useLocation();
  const orgContext = useOrg ? useOrg() : null;
  const { activeOrg, userRole, userOrgs, switchOrg } = orgContext || {};

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isOpen]);

  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await supabase.auth.signOut();
  }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const sidebarContent = (
    <div style={{
      width: '240px',
      minWidth: '240px',
      height: '100%',
      background: darkMode ? '#201810' : '#2A1F16',
      color: 'white',
      padding: '24px 12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 0 30px rgba(0,0,0,0.25)',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-60px',
        left: '-40px',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(241,94,28,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Brand + mobile close */}
      <div style={{ paddingLeft: '10px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '800', color: 'white', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(241,94,28,0.4)',
            }}>A</div>
            <h2 style={{
              fontSize: '17px', fontWeight: '800', letterSpacing: '-0.4px',
              background: 'linear-gradient(135deg, #f15e1c, #fab60a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0, lineHeight: 1,
            }}>
              ASTRAV
            </h2>
          </div>
          <p style={{ margin: '0 0 0 36px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Command Center
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '6px',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px',
              padding: '3px 8px', lineHeight: 1.4, display: 'none',
            }}
            className="sidebar-close-btn"
          >✕</button>
        )}
      </div>

      {/* Active Organization Badge & Switcher */}
      {activeOrg && (
        <div style={{
          margin: '0 6px 20px 6px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Organization</span>
            <span style={{
              fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
              color: userRole === 'owner' ? '#f87171' : userRole === 'manager' ? '#fab60a' : '#60a5fa',
              background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '8px'
            }}>
              {userRole}
            </span>
          </div>

          {userOrgs && userOrgs.length > 1 ? (
            <select
              value={activeOrg.id}
              onChange={(e) => switchOrg(e.target.value)}
              className="form-select"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#FFF8EF',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {userOrgs.map(o => (
                <option key={o.id} value={o.id} style={{ background: '#2E2013', color: '#fff' }}>
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFF8EF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeOrg.name}
            </div>
          )}
        </div>
      )}

      {/* Section label */}
      <p style={{
        fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.2)', margin: '0 0 8px 12px',
      }}>Navigation</p>

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
                borderRadius: '10px',
                textDecoration: 'none',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
                fontWeight: active ? '600' : '400',
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: active
                  ? 'linear-gradient(135deg, rgba(241,94,28,0.25), rgba(250,182,10,0.15))'
                  : 'transparent',
                borderLeft: active ? '2px solid #f15e1c' : '2px solid transparent',
                transition: 'all 0.18s ease',
                position: 'relative',
                letterSpacing: '-0.1px',
              }}
              className={`nav-link${active ? ' nav-link-active' : ''}`}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0, display: 'flex' }}>{icon}</span>
              {label}
              {active && (
                <span style={{
                  marginLeft: 'auto',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#f15e1c',
                  boxShadow: '0 0 6px rgba(241,94,28,0.8)',
                  flexShrink: 0,
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Reminders Button */}
      <button
        onClick={onOpenReminders}
        style={{
          padding: '10px 12px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: '400',
          fontSize: '13.5px',
          width: '100%',
          transition: 'all 0.18s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'left',
          letterSpacing: '-0.1px',
          marginBottom: '2px',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <span style={{ opacity: 0.6, flexShrink: 0, display: 'flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </span>
        Reminders
      </button>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 4px' }} />

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(239,68,68,0.2)',
          cursor: 'pointer',
          background: 'transparent',
          color: 'rgba(248,113,113,0.8)',
          fontWeight: '500',
          fontSize: '13.5px',
          width: '100%',
          transition: 'all 0.18s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          letterSpacing: '-0.1px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
          e.currentTarget.style.color = '#f87171';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
          e.currentTarget.style.color = 'rgba(248,113,113,0.8)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar-desktop" style={{ height: '100vh', position: 'sticky', top: 0, flexShrink: 0, zIndex: 100, display: 'none' }}>
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      <div className={`sidebar-overlay${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      {/* Mobile drawer */}
      <div
        className="sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'none',
        }}
      >
        {sidebarContent}
      </div>

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