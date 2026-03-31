import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function GoalProgressChart({ goals, tasks }) {

  const data = goals.map(goal => {
    const goalTasks = tasks.filter(task => task.goal_id === goal.id);
    const completedTasks = goalTasks.filter(task => task.completed).length;

    const progress =
      goalTasks.length === 0
        ? 0
        : Math.round((completedTasks / goalTasks.length) * 100);

    return {
      name: goal.title,
      progress
    };
  });

  return (
    <BarChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="progress" fill="#3b82f6" />
    </BarChart>
  );
}