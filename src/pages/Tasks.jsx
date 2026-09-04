import { useState } from "react";

const FILTER_CONFIG = {
  all:       { label: "All",       icon: "📋" },
  pending:   { label: "Pending",   icon: "⏳" },
  completed: { label: "Done",      icon: "✅" },
  overdue:   { label: "Overdue",   icon: "❗" },
  dueSoon:   { label: "Due Soon",  icon: "⏰" },
};

export default function Tasks({ tasks, goals, toggleTask, loading, darkMode }) {
  const [filter, setFilter] = useState("all");
  const [sortByUrgency, setSortByUrgency] = useState(true);
  const today = new Date();

  function getPriority(task) {
    if (task.completed) return 4;
    if (!task.deadline) return 3;
    const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 1;
    if (diff <= 2) return 2;
    return 3;
  }

  function getDeadlineStatus(task) {
    if (!task.deadline) return "";
    const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
    if (task.completed) return "✅ Completed";
    if (diff < 0) return "❗ Overdue";
    if (diff <= 2) return "⏰ Due soon";
    return `📅 ${task.deadline.split("T")[0]}`;
  }

  function getGoalTitle(goalId) {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.title : "No goal";
  }

  // Count tasks per filter for badges
  function countForFilter(f) {
    return tasks.filter(task => {
      if (f === "completed") return task.completed;
      if (f === "pending") return !task.completed;
      if (f === "overdue") {
        if (!task.deadline || task.completed) return false;
        return new Date(task.deadline) < today;
      }
      if (f === "dueSoon") {
        if (!task.deadline || task.completed) return false;
        const diff = (new Date(task.deadline) - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 2;
      }
      return true;
    }).length;
  }

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

  const displayedTasks = sortByUrgency
    ? [...filteredTasks].sort((a, b) => getPriority(a) - getPriority(b))
    : filteredTasks;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%", animation: "fadeIn 0.35s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", letterSpacing: "-0.6px", color: darkMode ? "#FFF3E2" : "#2E2013" }}>
            Tasks
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#9C8B76" : "#B3A18C" }}>
            {displayedTasks.length} task{displayedTasks.length !== 1 ? "s" : ""} shown
          </p>
        </div>

        <button
          style={{
            padding: "8px 16px", borderRadius: "10px",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #E8D9C5",
            cursor: "pointer", background: darkMode ? "#1E140C" : "#ffffff",
            color: darkMode ? "#E8D9C5" : "#6E5D4B",
            fontSize: "13px", fontWeight: "600",
            transition: "all 0.15s ease", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit",
          }}
          onClick={() => setSortByUrgency(!sortByUrgency)}
          onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#4A3C2C" : "#FFF3E2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = darkMode ? "#1E140C" : "#ffffff"; }}
        >
          <span style={{ fontSize: "11px" }}>⬇</span>
          {sortByUrgency ? "Sorted by Urgency" : "Sorted by Date"}
        </button>
      </div>

      {/* Filter pills with count badges */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Object.entries(FILTER_CONFIG).map(([f, { label, icon }]) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 14px", borderRadius: "20px",
                border: active ? "1px solid #f15e1c" : darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #F0DFC9",
                cursor: "pointer",
                background: active ? "#cf4a11" : darkMode ? "#1E140C" : "#ffffff",
                color: active ? "white" : darkMode ? "#B3A18C" : "#9C8B76",
                fontSize: "13px", fontWeight: active ? "700" : "400",
                transition: "all 0.15s ease", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: "6px",
                boxShadow: active ? "0 2px 8px rgba(241,94,28,0.3)" : "none",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "#f15e1c";
                  e.currentTarget.style.color = "#f15e1c";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#F0DFC9";
                  e.currentTarget.style.color = darkMode ? "#B3A18C" : "#9C8B76";
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {displayedTasks.map((task, idx) => {
          const status = getDeadlineStatus(task);
          const isOverdue = status.includes("Overdue");
          const isDueSoon = status.includes("Due soon");
          const accentColor = isOverdue ? "#C13E1A" : isDueSoon ? "#fab60a" : task.completed ? "#2e936f" : "transparent";

          return (
            <li
              key={task.id}
              className="stagger-item"
              style={{
                padding: "14px 16px", borderRadius: "12px",
                background: darkMode ? "#1E140C" : "#ffffff",
                border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #FFF3E2",
                display: "flex", alignItems: "flex-start", gap: "12px",
                boxShadow: darkMode ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
                borderLeft: `3px solid ${accentColor}`,
                cursor: "default",
                animationDelay: `${idx * 0.04}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = darkMode ? "0 4px 16px rgba(0,0,0,0.35)" : "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.background = darkMode ? "#243044" : "#fafbff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = darkMode ? "none" : "0 1px 4px rgba(0,0,0,0.04)";
                e.currentTarget.style.background = darkMode ? "#1E140C" : "#ffffff";
              }}
            >
              {/* Checkbox */}
              <button
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  fontSize: "18px", flexShrink: 0, marginTop: "2px", lineHeight: 1,
                  transition: "transform 0.15s ease",
                }}
                onClick={() => toggleTask(task.id, task.completed)}
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {task.completed ? "✅" : "⬜"}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                  {/* Goal badge */}
                  <span style={{
                    fontSize: "11px", fontWeight: "600", letterSpacing: "0.03em",
                    color: darkMode ? "#9C8B76" : "#B3A18C",
                    background: darkMode ? "rgba(255,255,255,0.06)" : "#FFF3E2",
                    padding: "2px 8px", borderRadius: "10px", whiteSpace: "nowrap",
                  }}>
                    {getGoalTitle(task.goal_id)}
                  </span>
                  {/* Task title */}
                  <span style={{
                    fontWeight: task.completed ? "400" : "500", fontSize: "14px",
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed
                      ? darkMode ? "#6E5D4B" : "#B3A18C"
                      : darkMode ? "#FFF3E2" : "#2E2013",
                    wordBreak: "break-word",
                  }}>
                    {task.title}
                  </span>
                </div>

                {status && (
                  <span style={{
                    fontSize: "12px", fontWeight: "500",
                    color: isOverdue ? "#ef4444" : isDueSoon ? "#f59e0b" : darkMode ? "#9C8B76" : "#B3A18C",
                  }}>
                    {status}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Empty state */}
      {displayedTasks.length === 0 && (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          background: darkMode ? "#1E140C" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #E8D9C5",
          marginTop: "16px",
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
          <p style={{ fontSize: "15px", fontWeight: "600", color: darkMode ? "#B3A18C" : "#9C8B76", margin: "0 0 6px" }}>
            {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          </p>
          <p style={{ fontSize: "13px", color: darkMode ? "#6E5D4B" : "#B3A18C", margin: 0 }}>
            {filter === "all" ? "Add tasks from the Goals page to get started" : "Nothing to show for this filter"}
          </p>
        </div>
      )}
    </div>
  );
}