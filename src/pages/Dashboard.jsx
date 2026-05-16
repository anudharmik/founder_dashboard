import StatCard from "../components/StatCard";
import TaskChart from "../components/TaskChart";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function Dashboard({ goals, tasks, darkMode, loading }) {
  const totalGoals = goals.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const today = new Date();

  const overdueTasks = tasks.filter((task) => {
    if (!task.deadline || task.completed) return false;
    const deadlineDate = new Date(task.deadline);
    return deadlineDate < today;
  });

  const upcomingTasks = tasks.filter((task) => {
    if (!task.deadline || task.completed) return false;
    const deadlineDate = new Date(task.deadline);
    const diff = (deadlineDate - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 2;
  });

  const [aiInsights, setAiInsights] = useState({
    focusToday: [],
    risk: "",
    insight: "",
  });

  console.log("Sending Tasks:", tasks);

  async function fetchAIInsights() {
    if (!tasks.length) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      if (!res.ok) throw new Error("Failed to fetch AI insights");

      const data = await res.json();
      setAiInsights(data);
      sessionStorage.setItem("aiInsightsCache", JSON.stringify(data));
      sessionStorage.setItem("tasksCache", JSON.stringify(tasks));
      toast.success("AI insights updated and ready to help you out");
    } catch (error) {
      console.error("Fetch failed:", error);
      toast.error("Failed to fetch AI insights");
    }
  }

  useEffect(() => {
    if (tasks.length > 0) {
      const currentTasksStr = JSON.stringify(tasks);
      const cachedTasksStr = sessionStorage.getItem("tasksCache");
      const cachedInsights = sessionStorage.getItem("aiInsightsCache");

      if (currentTasksStr === cachedTasksStr && cachedInsights) {
        try {
          setAiInsights(JSON.parse(cachedInsights));
        } catch (e) {
          fetchAIInsights();
        }
      } else {
        fetchAIInsights();
      }
    }
  }, [tasks]);

  function calculateProductivityScore() {
    if (!tasks.length) return 0;
    const completed = tasks.filter((task) => task.completed).length;
    const overdue = tasks.filter((task) => {
      if (!task.deadline || task.completed) return false;
      return new Date(task.deadline) < new Date();
    }).length;
    const completionRate = completed / tasks.length;
    let score = completionRate * 100 - overdue * 5;
    score = Math.max(0, Math.min(100, score));
    return Math.round(score);
  }

  const productivityScore = calculateProductivityScore();

  function calculateStreak() {
    const completedTasksWithDate = tasks.filter(
      (task) => task.completed && task.completed_at
    );
    if (!completedTasksWithDate.length) return 0;
    const dates = [
      ...new Set(
        completedTasksWithDate.map((task) =>
          new Date(task.completed_at).toISOString().split("T")[0]
        )
      ),
    ]
      .sort()
      .reverse();

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);
      const diff = (current - next) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  const streak = calculateStreak();

  const scoreColor =
    productivityScore >= 75
      ? "#22c55e"
      : productivityScore >= 45
      ? "#f59e0b"
      : "#ef4444";

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
  };

  const alertBase = {
    padding: "12px 18px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: "500",
  };

  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p
          style={{
            fontSize: "16px",
            fontWeight: "500",
            color: darkMode ? "#94a3b8" : "#64748b",
          }}
        >
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: "700",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
            color: darkMode ? "#f1f5f9" : "#0f172a",
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: darkMode ? "#64748b" : "#94a3b8",
            margin: 0,
          }}
        >
          {todayStr}
        </p>
      </div>

      {/* Alert banners */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0 || (overdueTasks.length === 0 && upcomingTasks.length === 0)) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "28px",
          }}
        >
          {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
            <div
              style={{
                ...alertBase,
                background: darkMode ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                color: darkMode ? "#4ade80" : "#166534",
                border: darkMode ? "1px solid rgba(34,197,94,0.15)" : "1px solid #bbf7d0",
              }}
            >
              <span>✅</span>
              <span>No urgent deadlines — you're all caught up!</span>
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div
              style={{
                ...alertBase,
                background: darkMode ? "rgba(239,68,68,0.08)" : "#fef2f2",
                color: darkMode ? "#f87171" : "#b91c1c",
                border: darkMode ? "1px solid rgba(239,68,68,0.15)" : "1px solid #fecaca",
              }}
            >
              <span>❗</span>
              <span>
                {overdueTasks.length} task{overdueTasks.length > 1 ? "s" : ""} overdue
              </span>
            </div>
          )}
          {upcomingTasks.length > 0 && (
            <div
              style={{
                ...alertBase,
                background: darkMode ? "rgba(245,158,11,0.08)" : "#fffbeb",
                color: darkMode ? "#fbbf24" : "#92400e",
                border: darkMode ? "1px solid rgba(245,158,11,0.15)" : "1px solid #fde68a",
              }}
            >
              <span>⏰</span>
              <span>
                {upcomingTasks.length} task{upcomingTasks.length > 1 ? "s" : ""} due soon
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main cards — responsive grid */}
      <div
        className="dashboard-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* AI Insights */}
        <div style={{ ...cardBase, display: "flex", flexDirection: "column" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: darkMode ? "#f1f5f9" : "#0f172a",
            }}
          >
            <span>🔥</span> Focus Today
          </h3>

          {aiInsights.focusToday?.map((task, index) => (
            <div
              key={index}
              style={{
                fontSize: "14px",
                padding: "10px 12px",
                background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                borderRadius: "8px",
                marginBottom: "6px",
                color: darkMode ? "#cbd5e1" : "#334155",
                borderLeft: "3px solid #818cf8",
              }}
            >
              {task}
            </div>
          ))}

          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              marginTop: "18px",
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: darkMode ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            ⚠️ Risk
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: darkMode ? "#94a3b8" : "#475569",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            {aiInsights.risk}
          </p>

          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              marginTop: "18px",
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: darkMode ? "#94a3b8" : "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            📊 Insight
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: darkMode ? "#94a3b8" : "#475569",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            {aiInsights.insight}
          </p>
        </div>

        {/* Score + Streak */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Productivity Score */}
          <div
            style={{
              ...cardBase,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              flex: 1,
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: darkMode ? "#64748b" : "#94a3b8",
                margin: "0 0 8px",
              }}
            >
              Productivity Score
            </p>
            <p
              style={{
                fontSize: "44px",
                fontWeight: "800",
                margin: "0 0 4px",
                letterSpacing: "-1px",
                color: scoreColor,
              }}
            >
              {productivityScore}
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "500",
                  color: darkMode ? "#475569" : "#94a3b8",
                }}
              >
                /100
              </span>
            </p>
            <p
              style={{
                fontSize: "13px",
                color: darkMode ? "#475569" : "#94a3b8",
                margin: 0,
              }}
            >
              Based on completed &amp; overdue tasks
            </p>
          </div>

          {/* Streak */}
          <div
            style={{
              ...cardBase,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              flex: 1,
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: darkMode ? "#64748b" : "#94a3b8",
                margin: "0 0 8px",
              }}
            >
              Current Streak
            </p>
            <p
              style={{
                fontSize: "44px",
                fontWeight: "800",
                margin: "0 0 4px",
                letterSpacing: "-1px",
                color: streak > 0 ? "#f59e0b" : darkMode ? "#f1f5f9" : "#0f172a",
              }}
            >
              {streak}
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "500",
                  color: darkMode ? "#475569" : "#94a3b8",
                }}
              >
                {" "}
                days
              </span>
            </p>
            <p
              style={{
                fontSize: "13px",
                color: darkMode ? "#475569" : "#94a3b8",
                margin: 0,
              }}
            >
              Consecutive productive days
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards row */}
      <div
        className="dashboard-stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "16px",
          width: "100%",
        }}
      >
        <StatCard title="Total Goals" value={totalGoals} darkMode={darkMode} />
        <StatCard title="Total Tasks" value={totalTasks} darkMode={darkMode} />
        <StatCard title="Completed" value={completedTasks} darkMode={darkMode} />
        <StatCard title="Rate" value={`${completionRate}%`} darkMode={darkMode} />
        <TaskChart completed={completedTasks} remaining={remainingTasks} />
      </div>

      {/* Responsive grid rules */}
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