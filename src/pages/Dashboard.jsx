import StatCard from "../components/StatCard";
import TaskChart from "../components/TaskChart";
import toast from "react-hot-toast";
import { useOrg } from "../context/OrgContext";

// Skeleton placeholder
function SkeletonBlock({ height = 16, width = '100%', style = {} }) {
  return (
    <div className="skeleton-dark" style={{ height, width, borderRadius: 6, ...style }} />
  );
}

function DashboardSkeleton({ darkMode }) {
  const cardBase = {
    padding: '24px', borderRadius: '16px',
    background: darkMode ? '#1e293b' : '#ffffff',
    boxShadow: darkMode ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)',
    border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.04)',
  };
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '1200px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '28px' }}>
        <SkeletonBlock height={28} width={180} style={{ marginBottom: 10 }} />
        <SkeletonBlock height={14} width={140} />
      </div>
      {/* Alert skeleton */}
      <SkeletonBlock height={44} style={{ borderRadius: 10, marginBottom: 24 }} />
      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ ...cardBase }}>
          <SkeletonBlock height={18} width={120} style={{ marginBottom: 20 }} />
          <SkeletonBlock height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock height={14} width="85%" style={{ marginBottom: 8 }} />
          <SkeletonBlock height={14} width="70%" style={{ marginBottom: 20 }} />
          <SkeletonBlock height={14} width={80} style={{ marginBottom: 8 }} />
          <SkeletonBlock height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock height={14} width="90%" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardBase}><SkeletonBlock height={48} width={120} style={{ marginBottom: 8 }} /><SkeletonBlock height={14} width={180} /></div>
          <div style={cardBase}><SkeletonBlock height={48} width={100} style={{ marginBottom: 8 }} /><SkeletonBlock height={14} width={180} /></div>
        </div>
      </div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ ...cardBase, minHeight: 130 }}>
            <SkeletonBlock height={11} width={80} style={{ marginBottom: 12 }} />
            <SkeletonBlock height={32} width={60} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ goals, tasks, darkMode, loading, aiInsights, aiLoading, refreshAIInsights }) {
  const { isGuest } = useOrg() || {};
  const totalGoals = goals.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const today = new Date();

  const overdueTasks = tasks.filter((task) => {
    if (!task.deadline || task.completed) return false;
    return new Date(task.deadline) < today;
  });

  const upcomingTasks = tasks.filter((task) => {
    if (!task.deadline || task.completed) return false;
    const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 2;
  });

  function calculateProductivityScore() {
    if (!tasks.length) return 0;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter((t) => {
      if (!t.deadline || t.completed) return false;
      return new Date(t.deadline) < new Date();
    }).length;
    let score = (completed / tasks.length) * 100 - overdue * 5;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  const productivityScore = calculateProductivityScore();

  function calculateStreak() {
    const completedWithDate = tasks.filter((t) => t.completed && t.completed_at);
    if (!completedWithDate.length) return 0;
    const dates = [...new Set(completedWithDate.map((t) =>
      new Date(t.completed_at).toISOString().split("T")[0]
    ))].sort().reverse();
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i + 1])) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  const streak = calculateStreak();

  const scoreColor =
    productivityScore >= 75 ? "#22c55e"
    : productivityScore >= 45 ? "#f59e0b"
    : "#ef4444";

  const cardBase = {
    padding: '24px', borderRadius: '16px',
    background: darkMode ? '#1e293b' : '#ffffff',
    boxShadow: darkMode ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)',
    border: darkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.04)',
  };

  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  if (loading) return <DashboardSkeleton darkMode={darkMode} />;

  const hasAI = aiInsights.focusToday?.length > 0 || aiInsights.risk || aiInsights.insight;

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      maxWidth: '1200px', margin: '0 auto', width: '100%',
      animation: 'fadeIn 0.35s ease',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: '800', margin: '0 0 4px',
          letterSpacing: '-0.6px', color: darkMode ? '#f1f5f9' : '#0f172a',
        }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: darkMode ? '#64748b' : '#94a3b8', margin: 0 }}>
          {todayStr}
        </p>
      </div>

      {/* Alert banners */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0 || (overdueTasks.length === 0 && upcomingTasks.length === 0)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
          {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
            <div className="animate-slide-down" style={{
              padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13.5px', fontWeight: '500',
              background: darkMode ? 'rgba(34,197,94,0.08)' : '#f0fdf4',
              color: darkMode ? '#4ade80' : '#166534',
              border: darkMode ? '1px solid rgba(34,197,94,0.18)' : '1px solid #bbf7d0',
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span>All caught up — no urgent deadlines today!</span>
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="animate-slide-down" style={{
              padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13.5px', fontWeight: '500',
              background: darkMode ? 'rgba(239,68,68,0.08)' : '#fef2f2',
              color: darkMode ? '#f87171' : '#b91c1c',
              border: darkMode ? '1px solid rgba(239,68,68,0.18)' : '1px solid #fecaca',
            }}>
              <span style={{ fontSize: '16px' }}>❗</span>
              <span>{overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} overdue — needs attention</span>
            </div>
          )}
          {upcomingTasks.length > 0 && (
            <div className="animate-slide-down" style={{
              padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13.5px', fontWeight: '500',
              background: darkMode ? 'rgba(245,158,11,0.08)' : '#fffbeb',
              color: darkMode ? '#fbbf24' : '#92400e',
              border: darkMode ? '1px solid rgba(245,158,11,0.18)' : '1px solid #fde68a',
            }}>
              <span style={{ fontSize: '16px' }}>⏰</span>
              <span>{upcomingTasks.length} task{upcomingTasks.length > 1 ? 's' : ''} due within 48 hours</span>
            </div>
          )}
        </div>
      )}

      {/* Main grid: AI Insights + Score/Streak */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>

        {/* AI Insights Card */}
        {isGuest ? (
          <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
              AI Insights Disabled
            </h3>
            <p style={{ fontSize: '13px', color: darkMode ? '#64748b' : '#94a3b8', margin: 0, maxWidth: '300px', lineHeight: '1.5' }}>
              Guests do not have access to organization AI productivity insights per security policy.
            </p>
          </div>
        ) : (
          <div style={{ ...cardBase, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Background accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                <span style={{ fontSize: '18px' }}>🔥</span> Focus Today
              </h3>
              <button
                onClick={refreshAIInsights}
                disabled={aiLoading}
                style={{
                  padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.3)',
                  background: 'transparent', color: '#818cf8', fontSize: '11px', fontWeight: '600',
                  cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.6 : 1,
                  transition: 'all 0.15s ease', letterSpacing: '0.02em',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={(e) => { if (!aiLoading) { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {aiLoading ? <span className="spinner" /> : '↻'} Refresh
              </button>
            </div>

            {/* Focus Today items */}
            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {[1,2,3].map(i => <SkeletonBlock key={i} height={40} style={{ borderRadius: 8 }} />)}
              </div>
            ) : aiInsights.focusToday?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {aiInsights.focusToday.map((task, index) => (
                  <div key={index} style={{
                    fontSize: '13.5px', padding: '10px 14px',
                    background: darkMode ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
                    borderRadius: '10px', color: darkMode ? '#c7d2fe' : '#3730a3',
                    borderLeft: '3px solid #6366f1',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    animation: `slideUp 0.3s ${index * 0.08}s ease both`,
                    lineHeight: '1.5',
                  }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: 'rgba(99,102,241,0.2)', color: '#818cf8',
                      fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, marginTop: '1px',
                    }}>{index + 1}</span>
                    {task}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: darkMode ? '#475569' : '#94a3b8', marginBottom: '20px', lineHeight: '1.6' }}>
                No tasks yet — add some to get AI-powered focus recommendations.
              </p>
            )}

            {/* Risk section */}
            <div style={{
              padding: '12px 14px', borderRadius: '10px', marginBottom: '12px',
              background: darkMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.05)',
              border: darkMode ? '1px solid rgba(245,158,11,0.15)' : '1px solid rgba(245,158,11,0.2)',
            }}>
              <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 6px' }}>
                ⚠️ Risk
              </p>
              {aiLoading ? <SkeletonBlock height={14} /> : (
                <p style={{ fontSize: '13.5px', color: darkMode ? '#cbd5e1' : '#475569', lineHeight: '1.6', margin: 0 }}>
                  {aiInsights.risk || 'No risk signals detected.'}
                </p>
              )}
            </div>

            {/* Insight section */}
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: darkMode ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.05)',
              border: darkMode ? '1px solid rgba(6,182,212,0.15)' : '1px solid rgba(6,182,212,0.2)',
            }}>
              <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#06b6d4', margin: '0 0 6px' }}>
                📊 Insight
              </p>
              {aiLoading ? <SkeletonBlock height={14} /> : (
                <p style={{ fontSize: '13.5px', color: darkMode ? '#cbd5e1' : '#475569', lineHeight: '1.6', margin: 0 }}>
                  {aiInsights.insight || 'Complete more tasks to generate insights.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Score + Streak column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Productivity Score */}
          <div style={{ ...cardBase, flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: `radial-gradient(circle, ${scoreColor}15 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: darkMode ? '#64748b' : '#94a3b8', margin: '0 0 12px' }}>
              Productivity Score
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '52px', fontWeight: '900', lineHeight: 1,
                letterSpacing: '-2px', color: scoreColor,
                textShadow: `0 0 24px ${scoreColor}50`,
                animation: 'countUp 0.5s ease',
              }}>{productivityScore}</span>
              <span style={{ fontSize: '20px', fontWeight: '500', color: darkMode ? '#334155' : '#cbd5e1', marginBottom: '6px' }}>/100</span>
            </div>
            <div style={{ height: '4px', background: darkMode ? '#0f172a' : '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: `${productivityScore}%`, height: '100%', background: scoreColor, borderRadius: '4px', transition: 'width 1s ease-out' }} />
            </div>
            <p style={{ fontSize: '12px', color: darkMode ? '#475569' : '#94a3b8', margin: 0 }}>
              Based on completed &amp; overdue tasks
            </p>
          </div>

          {/* Streak */}
          <div style={{ ...cardBase, flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: streak > 0 ? 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' : 'none',
              pointerEvents: 'none',
            }} />
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: darkMode ? '#64748b' : '#94a3b8', margin: '0 0 12px' }}>
              Current Streak
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '52px', fontWeight: '900', lineHeight: 1, letterSpacing: '-2px',
                color: streak > 0 ? '#f59e0b' : darkMode ? '#334155' : '#e2e8f0',
                textShadow: streak > 0 ? '0 0 24px rgba(245,158,11,0.4)' : 'none',
                animation: 'countUp 0.5s ease',
              }}>{streak}</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: darkMode ? '#475569' : '#94a3b8', marginBottom: '8px' }}>days</span>
              {streak > 0 && <span style={{ fontSize: '24px', marginBottom: '4px' }}>🔥</span>}
            </div>
            <p style={{ fontSize: '12px', color: darkMode ? '#475569' : '#94a3b8', margin: 0 }}>
              Consecutive productive days
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="dashboard-stat-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px', width: '100%',
      }}>
        <StatCard title="Goals" value={totalGoals} darkMode={darkMode} accent="#6366f1" icon="🎯" />
        <StatCard title="Total Tasks" value={totalTasks} darkMode={darkMode} accent="#8b5cf6" icon="📋" />
        <StatCard title="Completed" value={completedTasks} darkMode={darkMode} accent="#22c55e" icon="✅" />
        <StatCard title="Rate" value={`${completionRate}%`} darkMode={darkMode} accent="#f59e0b" icon="📈" />
        <TaskChart completed={completedTasks} remaining={remainingTasks} />
      </div>

      <style>{`
        @media (min-width: 768px) {
          .dashboard-main-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
          }
          .dashboard-stat-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  );
}