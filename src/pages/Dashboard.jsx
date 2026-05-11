import StatCard from "../components/StatCard";
import TaskChart from "../components/TaskChart";
import {useState,useEffect} from "react"
import toast from "react-hot-toast";

export default function Dashboard({goals,tasks,darkMode,loading}){
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

    const [aiInsights, setAiInsights] = useState({
  focusToday: [],
  risk: "",
  insight: ""
});
    console.log("Sending Tasks:",tasks);

async function fetchAIInsights() {
    if(!tasks.length) return;
  try {
    const res = await fetch("http://localhost:3001/api/ai-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tasks }),
    });

     if (!res.ok) {
      throw new Error("Failed to fetch AI insights");
    }
    const data = await res.json();

    setAiInsights(data);
    
    sessionStorage.setItem("aiInsightsCache", JSON.stringify(data));
    sessionStorage.setItem("tasksCache", JSON.stringify(tasks));
    toast.success("AI insights updated and ready to help you out");

  } catch (error) {
    console.error("Fetch failed:", error);
    toast.error("Failed to fetch AI insights")
  }
}

    useEffect(()=>{
        if(tasks.length>0){
            const currentTasksStr = JSON.stringify(tasks);
            const cachedTasksStr = sessionStorage.getItem("tasksCache");
            const cachedInsights = sessionStorage.getItem("aiInsightsCache");

            if (currentTasksStr === cachedTasksStr && cachedInsights) {
                try {
                    setAiInsights(JSON.parse(cachedInsights));
                } catch (e) {
                    fetchAIInsights();
                }
            } else {
                fetchAIInsights();
            }
        }
    },[tasks]);

    if(loading){
        return <p>Loading dashboard...</p>;
    }
    return (
        <div
            style={{
                maxWidth:"1200px",
                margin:"0 auto",
                padding:"30px 20px",
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

            <div
  style={{
    padding: "20px",
    borderRadius: "12px",
    background: darkMode ? "#1e293b" : "#ffffff",
    marginTop: "20px"
  }}
>
  <h3>🔥 Focus Today</h3>

  {aiInsights.focusToday?.map((task, index) => (
    <p key={index}>• {task}</p>
  ))}

  <h3 style={{ marginTop: "15px" }}>⚠️ Risk</h3>
  <p>{aiInsights.risk}</p>

  <h3 style={{ marginTop: "15px" }}>📊 Insight</h3>
  <p>{aiInsights.insight}</p>
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
        {/* <div style={{ marginTop: "30px" }}>
        <h2>AI Insights</h2>
        {aiInsights ? (
            <p style={{ whiteSpace: "pre-line" }}>
            {aiInsights}
            </p>
        ) : (
            <p>Generating insights...</p>
        )}
        </div> */}
        </div>
    )
}