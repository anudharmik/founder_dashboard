import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function GoalProgressChart({ goals, tasks }) {
  const data = goals.map((goal) => {
    const goalTasks = tasks.filter((task) => task.goal_id === goal.id);
    const completedTasks = goalTasks.filter((task) => task.completed).length;

    const progress =
      goalTasks.length === 0
        ? 0
        : Math.round((completedTasks / goalTasks.length) * 100);

    return {
      name: goal.title.length > 14 ? goal.title.slice(0, 14) + "…" : goal.title,
      progress,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} unit="%" />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#e2e8f0",
          }}
          formatter={(v) => [`${v}%`, "Progress"]}
        />
        <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}