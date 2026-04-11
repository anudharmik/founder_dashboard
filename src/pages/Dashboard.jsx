import StatCard from "../components/StatCard";
import TaskChart from "../components/TaskChart";

export default function Dashboard({goals,tasks,darkMode}){
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
        <div
            style={{
                maxWidth:"1200px",
                margin:"0 auto",
                //padding:"30px 20px",
                width:"100%"
            }}
        >
        <h1 style={{fontSize:"28px",fontWeight:"600",marginBottom:"10px"}}>Dashboard</h1>

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
                    <div style={{padding:"10px 15px",borderRadius:"8px",background:"#fee2e2",color:"#b91c1c",marginBottom:"10px"}}>
                        ❗ {overdueTasks.length} task{overdueTasks.length>1?"s":""} overdue
                    </div>
                )}

                {upcomingTasks.length>0 && (
                    <div style={{padding:"10px 15px",borderRadius:"8px",background:"#fef3c7",color:"#92400e"}}>
                        ⚠️ {upcomingTasks.length} task{upcomingTasks.length>1?"s":""}
                    </div>
                )}
            </div>

            <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
                gap:"20px",
                marginTop:"20px",
                width:"100%"
            }}>
            <StatCard title="Total Goals" value={totalGoals} darkMode={darkMode} />
            <StatCard title="Total Tasks" value={totalTasks} darkMode={darkMode} />
            <StatCard title="Completed Tasks" value={completedTasks} darkMode={darkMode} />
            <StatCard title="Completion Rate" value={`${completionRate}%`} darkMode={darkMode} />
            <TaskChart completed={completedTasks} remaining={remainingTasks}/>
            </div>

        </div>
        </div>
    )
}