import { useState } from "react";
import GoalChart from "../components/GoalChart";
import GoalProgressChart from "../components/GoalProgressChart";
import WeeklyChart from "../components/WeeklyChart";

export default function Analytics({ goals, tasks, darkMode }) {
  const [selectedGoal, setSelectedGoal] = useState("");

  const filteredTasks = tasks.filter((task) => task.goal_id === selectedGoal);

  // Summary stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const overdueTasks = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;

  const cardBase = {
    padding: "24px", borderRadius: "16px",
    background: darkMode ? "#1e293b" : "#ffffff",
    boxShadow: darkMode ? "0 2px 16px rgba(0,0,0,0.4)" : "0 2px 16px rgba(0,0,0,0.06)",
    border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
    marginBottom: "20px",
  };

  const sectionLabel = {
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase",
    color: darkMode ? "#64748b" : "#94a3b8", margin: "0 0 16px",
    display: "flex", alignItems: "center", gap: "8px",
  };

  const SUMMARY_STATS = [
    { label: "Total Goals", value: goals.length, accent: "#6366f1", icon: "🎯" },
    { label: "Completion Rate", value: `${completionRate}%`, accent: "#22c55e", icon: "📈" },
    { label: "Tasks Done", value: `${completedTasks}/${totalTasks}`, accent: "#8b5cf6", icon: "✅" },
    { label: "Overdue", value: overdueTasks, accent: "#ef4444", icon: "❗" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.35s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", margin: "0 0 4px",
          letterSpacing: "-0.6px", color: darkMode ? "#f1f5f9" : "#0f172a",
        }}>Analytics</h1>
        <p style={{ fontSize: "13px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
          Visual breakdown of your goals and tasks
        </p>
      </div>

      {/* Summary stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {SUMMARY_STATS.map((s, i) => (
          <div
            key={i}
            className="stagger-item"
            style={{
              borderRadius: "14px", padding: "0", overflow: "hidden",
              background: darkMode ? "#1e293b" : "#ffffff",
              boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)",
              border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ height: "3px", background: `linear-gradient(90deg, ${s.accent}, ${s.accent}80)` }} />
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <span style={{ fontSize: "14px" }}>{s.icon}</span>
                <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
                  {s.label}
                </p>
              </div>
              <p style={{ fontSize: "28px", fontWeight: "800", margin: 0, letterSpacing: "-0.5px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Goal selector */}
      <div style={{ ...cardBase, padding: "18px 24px" }}>
        <p style={sectionLabel}>
          <span>🔍</span> Filter by Goal
        </p>
        <select
          style={{
            padding: "10px 14px", borderRadius: "10px",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
            background: darkMode ? "#0f172a" : "#f8fafc",
            color: darkMode ? "#e2e8f0" : "#0f172a",
            outline: "none", cursor: "pointer", fontSize: "14px",
            width: "100%", maxWidth: "360px",
            fontFamily: "inherit",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          value={selectedGoal}
          onChange={(e) => setSelectedGoal(e.target.value)}
        >
          <option value="">All goals</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
      </div>

      {/* Goal Specific Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}><span>📊</span> Goal Specific Progress</p>
        {!selectedGoal ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>☝️</div>
            <p style={{ fontSize: "14px", color: darkMode ? "#475569" : "#94a3b8", margin: 0 }}>
              Select a goal above to view its task progress chart
            </p>
          </div>
        ) : (
          <div className="chart-scroll">
            <GoalChart tasks={filteredTasks} />
          </div>
        )}
      </div>

      {/* All Goals Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}><span>🏆</span> All Goals Progress</p>
        {goals.length === 0 ? (
          <p style={{ fontSize: "14px", color: darkMode ? "#475569" : "#94a3b8", margin: 0 }}>No goals yet.</p>
        ) : (
          <div className="chart-scroll">
            <GoalProgressChart goals={goals} tasks={tasks} />
          </div>
        )}
      </div>

      {/* Weekly Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}><span>📅</span> Weekly Progress</p>
        <div className="chart-scroll">
          <WeeklyChart tasks={tasks} />
        </div>
      </div>
    </div>
  );
}