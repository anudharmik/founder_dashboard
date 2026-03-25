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

    const today=new Date();
    const overdueTasks=tasks.filter(task=>{
        if(!task.deadline || task.completed) return false;

        const deadlineDate=new Date(task.deadline);
        return deadlineDate<today;
    });

    const upcomingTasks=tasks.filter(task=>{
        if(!task.deadline || task.completed) return false;
        const deadlineDate=new Date(task.deadline);
        const diff=(deadlineDate-today)/(1000*60*60*24);
        return diff>=0 && diff<=2;
    });

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
            <div style={{marginBottom:"20px"}}>

                {overdueTasks.length ===0 && upcomingTasks.length===0 && (
                    <p style={{color:"red",fontWeight:"bold"}}>
                        ✅ No urgent deadlines as of now
                    </p>
                )}

                {overdueTasks.length>0 && (
                    <p style={{color:"red",fontWeight:"bold"}}>
                        ❗ {overdueTasks.length} task{overdueTasks>1?"s":""} overdue
                    </p>
                )}

                {upcomingTasks.length>0 && (
                    <p style={{color:"orange",fontSynthesisWeight:'bold'}}>
                        ⚠️ {upcomingTasks.length} task{upcomingTasks.length>1?"s":""}
                    </p>
                )}
            </div>
            
            <StatCard title="Total Goals" value={totalGoals} />
            <StatCard title="Total Tasks" value={totalTasks} />
            <StatCard title="Completed Tasks" value={completedTasks} />
            <StatCard title="Completion Rate" value={`${completionRate}%`} />
            <TaskChart completed={completedTasks} remaining={remainingTasks}/>

        </div>
        </div>
    )
}