import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function TaskChart({ completed, remaining }) {
  const data = [
    { name: "Completed", value: completed },
    { name: "Remaining", value: remaining },
  ];

  const COLORS = ["#2e936f", "#C13E1A"];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={95}
          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1E140C",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#E8D9C5",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}