import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function TaskChart({ completed, remaining }) {

  const data = [
    { name: "Completed", value: completed },
    { name: "Remaining", value: remaining }
  ];

  const COLORS = ["#175f19", "#6e1009"];

  return (
    <PieChart width={400} height={300}>
      <Pie
        data={data}
        dataKey="value"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label
      >
        {data.map((entry, index) => (
          <Cell key={index} fill={COLORS[index]} />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  );
}