import { useState } from "react";

export default function Tasks({ tasks, goals, toggleTask, loading, darkMode }) {
  const [filter, setFilter] = useState("all");
  const today = new Date();
  const [sortByUrgency, setSortByUrgency] = useState(true);

  const filteredTasks = tasks.filter(task => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    if (filter === "overdue") {
      if (!task.deadline || task.completed) return false;
      return new Date(task.deadline) < today;
    }
    if (filter === "dueSoon") {
      if (!task.deadline || task.completed) return false;
      const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 2;
    }
    return true;
  });

  function getPriority(task) {
    if (task.completed) return 4;
    if (!task.deadline) return 3;
    const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 1;
    if (diff <= 2) return 2;
    return 3;
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => getPriority(a) - getPriority(b));
  const displayedTasks = sortByUrgency ? sortedTasks : filteredTasks;

  function getGoalTitle(goalId) {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.title : "Unknown";
  }

  function getDeadlineStatus(task) {
    if (!task.deadline) return "";
    const deadlineDate = new Date(task.deadline);
    const diff = (deadlineDate - today) / (1000 * 60 * 60 * 24);
    if (task.completed) return "✅ Completed";
    if (diff < 0) return "❗ Overdue";
    if (diff <= 2) return "⏰ Due soon";
    return `📅 ${task.deadline.split("T")[0]}`;
  }

  const FILTERS = ["all", "completed", "pending", "overdue", "dueSoon"];
  const filterLabel = (f) => f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').trim();

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
            Tasks
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: darkMode ? "#64748b" : "#94a3b8" }}>
            {displayedTasks.length} task{displayedTasks.length !== 1 ? "s" : ""} shown
          </p>
        </div>
        <button
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
            cursor: "pointer",
            background: darkMode ? "#1e293b" : "#ffffff",
            color: darkMode ? "#e2e8f0" : "#475569",
            fontSize: "13px",
            fontWeight: "500",
            transition: "all 0.15s ease",
          }}
          onClick={() => setSortByUrgency(!sortByUrgency)}
          onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#334155" : "#f1f5f9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#1e293b" : "#ffffff"; }}
        >
          {sortByUrgency ? "⬇ Sort: Urgency" : "⬇ Sort: Deadline"}
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: active
                  ? "1px solid #6366f1"
                  : darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
                cursor: "pointer",
                background: active ? "#6366f1" : darkMode ? "#1e293b" : "#ffffff",
                color: active ? "white" : darkMode ? "#94a3b8" : "#64748b",
                fontSize: "13px",
                fontWeight: active ? "600" : "400",
                transition: "all 0.15s ease",
              }}
            >
              {filterLabel(f)}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {displayedTasks.map(task => {
          const status = getDeadlineStatus(task);
          const isOverdue = status.includes("Overdue");
          const isDueSoon = status.includes("Due soon");
          return (
            <li
              key={task.id}
              style={{
                padding: "14px 18px",
                borderRadius: "12px",
                background: darkMode ? "#1e293b" : "#ffffff",
                border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                boxShadow: darkMode ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s ease",
                borderLeft: isOverdue
                  ? "3px solid #ef4444"
                  : isDueSoon
                  ? "3px solid #f59e0b"
                  : task.completed
                  ? "3px solid #22c55e"
                  : "3px solid transparent",
              }}
            >
              <span
                style={{ cursor: "pointer", fontSize: "18px", flexShrink: 0 }}
                onClick={() => toggleTask(task.id, task.completed)}
              >
                {task.completed ? "✅" : "⬜"}
              </span>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    letterSpacing: "0.04em",
                    color: darkMode ? "#64748b" : "#94a3b8",
                    background: darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    whiteSpace: "nowrap",
                  }}>
                    {getGoalTitle(task.goal_id)}
                  </span>
                  <span style={{
                    fontWeight: task.completed ? "400" : "500",
                    fontSize: "14px",
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed
                      ? darkMode ? "#475569" : "#94a3b8"
                      : darkMode ? "#f1f5f9" : "#0f172a",
                  }}>
                    {task.title}
                  </span>
                </div>
              </div>

              {status && (
                <span style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: isOverdue ? "#ef4444" : isDueSoon ? "#f59e0b" : darkMode ? "#64748b" : "#94a3b8",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {status}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Empty state */}
      {displayedTasks.length === 0 && (
        <div style={{
          padding: "48px",
          textAlign: "center",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #e2e8f0",
          marginTop: "16px",
        }}>
          <p style={{ fontSize: "15px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
            No tasks for this filter.
          </p>
        </div>
      )}
    </>
  );
}