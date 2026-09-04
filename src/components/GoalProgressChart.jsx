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
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9C8B76" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#9C8B76" }} unit="%" />
        <Tooltip
          contentStyle={{
            background: "#1E140C",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#E8D9C5",
          }}
          formatter={(v) => [`${v}%`, "Progress"]}
        />
        <Bar dataKey="progress" fill="#f15e1c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}