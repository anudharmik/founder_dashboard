import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function WeeklyChart({ tasks }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const data = days.map((day, index) => {
    const count = tasks.filter((task) => {
      if (!task.completed || !task.completed_at) return false;
      const date = new Date(task.completed_at);
      return date.getDay() === index;
    }).length;

    return { day, completed: count };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#e2e8f0",
          }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke="#f15e1c"
          strokeWidth={2}
          dot={{ r: 4, fill: "#f15e1c" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}