export default function StatCard({ title, value, darkMode, accent = '#6366f1', icon }) {
  return (
    <div
      className="stagger-item"
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = darkMode
          ? '0 12px 32px rgba(0,0,0,0.5)'
          : '0 12px 32px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = darkMode
          ? '0 2px 12px rgba(0,0,0,0.35)'
          : '0 2px 12px rgba(0,0,0,0.06)';
      }}
      style={{
        borderRadius: '16px',
        padding: '0',
        background: darkMode ? '#1e293b' : '#ffffff',
        color: darkMode ? '#f8fafc' : '#0f172a',
        boxShadow: darkMode
          ? '0 2px 12px rgba(0,0,0,0.35)'
          : '0 2px 12px rgba(0,0,0,0.06)',
        minHeight: '130px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
        border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Accent top stripe */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}88)`, flexShrink: 0 }} />

      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
        {/* Background glow blob */}
        <div style={{
          position: 'absolute', top: '-10px', right: '-10px',
          width: '80px', height: '80px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Icon + label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {icon && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <p style={{
            fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: darkMode ? '#64748b' : '#94a3b8',
            margin: 0,
          }}>
            {title}
          </p>
        </div>

        <p style={{
          fontSize: '32px', fontWeight: '800', margin: 0,
          letterSpacing: '-1px',
          color: darkMode ? '#f1f5f9' : '#0f172a',
          animation: 'countUp 0.4s ease both',
          lineHeight: 1,
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}