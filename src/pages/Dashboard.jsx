import StatCard from "../components/StatCard";
import TaskChart from "../components/TaskChart";

export default function Dashboard({goals,tasks}){
    const totalGoals=goals.length;
    const totalTasks=tasks.length;
    const completedTasks=tasks.filter(
        task=>task.completed
    ).length;

    const remainingTasks=totalTasks-completedTasks;
    const completionRate=
        totalTasks===0?0:Math.round((completedTasks/totalTasks)*100);
    return (
        <div>
        <h1>Dashboard</h1>

        <div
        style={{
            display:"flex",
            gap:"20px",
            flexWrap:"wrap"
        }}
        >
            <StatCard title="Total Goals" value={totalGoals} />
            <StatCard title="Total Tasks" value={totalTasks} />
            <StatCard title="Completed Tasks" value={completedTasks} />
            <StatCard title="Completion Rate" value={`${completionRate}%`} />
            <TaskChart completed={completedTasks} remaining={remainingTasks}/>

        </div>
        </div>
    )
}