import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export default function WeeklyChart({ tasks }) {

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const data = days.map((day, index) => {
    const count = tasks.filter(task => {
      if (!task.completed || !task.completed_at) return false;

      const date = new Date(task.completed_at);
      return date.getDay() === index;
    }).length;

    return { day, completed: count };
  });

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="day" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="completed" stroke="#4CAF50" />
    </LineChart>
  );
}