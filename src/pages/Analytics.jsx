import { useState } from "react";
import GoalChart from "../components/GoalChart";
import GoalProgressChart from "../components/GoalProgressChart";
import WeeklyChart from "../components/WeeklyChart";

export default function Analytics({ goals, tasks, darkMode }) {
  const [selectedGoal, setSelectedGoal] = useState("");

  const filteredTasks = tasks.filter((task) => task.goal_id === selectedGoal);

  const cardBase = {
    padding: "24px",
    borderRadius: "16px",
    background: darkMode ? "#1e293b" : "#ffffff",
    boxShadow: darkMode
      ? "0 2px 16px rgba(0,0,0,0.4)"
      : "0 2px 16px rgba(0,0,0,0.06)",
    border: darkMode
      ? "1px solid rgba(255,255,255,0.07)"
      : "1px solid rgba(0,0,0,0.04)",
    marginBottom: "20px",
  };

  const sectionLabel = {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: darkMode ? "#64748b" : "#94a3b8",
    margin: "0 0 16px",
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: "700",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
            color: darkMode ? "#f1f5f9" : "#0f172a",
          }}
        >
          Analytics
        </h1>
        <p style={{ fontSize: "14px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
          Visual breakdown of your goals and tasks
        </p>
      </div>

      {/* Goal selector — stacks on mobile */}
      <div
        style={{
          ...cardBase,
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "16px 20px",
          flexDirection: "column",
        }}
      >
        <label
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: darkMode ? "#94a3b8" : "#64748b",
            whiteSpace: "nowrap",
          }}
        >
          Filter by Goal
        </label>
        <select
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
            background: darkMode ? "#0f172a" : "#f8fafc",
            color: darkMode ? "#e2e8f0" : "#0f172a",
            outline: "none",
            cursor: "pointer",
            fontSize: "14px",
            width: "100%",
            maxWidth: "320px",
          }}
          value={selectedGoal}
          onChange={(e) => setSelectedGoal(e.target.value)}
        >
          <option value="">All goals</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>

      {/* Goal Specific Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}>Goal Specific Progress</p>
        {!selectedGoal ? (
          <p style={{ fontSize: "14px", color: darkMode ? "#475569" : "#94a3b8", margin: 0 }}>
            Select a goal above to view its task progress.
          </p>
        ) : (
          <div className="chart-scroll">
            <GoalChart tasks={filteredTasks} />
          </div>
        )}
      </div>

      {/* All Goals Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}>All Goals Progress</p>
        <div className="chart-scroll">
          <GoalProgressChart goals={goals} tasks={tasks} />
        </div>
      </div>

      {/* Weekly Progress */}
      <div style={cardBase}>
        <p style={sectionLabel}>Weekly Progress</p>
        <div className="chart-scroll">
          <WeeklyChart tasks={tasks} />
        </div>
      </div>
    </div>
  );
}