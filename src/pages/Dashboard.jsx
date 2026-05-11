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

    function calculateProductivityScore() {
    if (!tasks.length) return 0;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const overdue = tasks.filter(task => {
        if (!task.deadline || task.completed) {
            return false;
        }
        return new Date(task.deadline) < new Date();
    }).length;

    const completionRate=completed / tasks.length;
    let score =completionRate * 100 - overdue * 5;
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
    }

    const productivityScore = calculateProductivityScore();

    function calculateStreak() {

  // completed tasks only
  const completedTasks = tasks.filter(
    task => task.completed && task.completed_at
  );

  if (!completedTasks.length) {
    return 0;
  }

  // unique completion dates
  const dates = [
    ...new Set(
      completedTasks.map(task =>
        new Date(task.completed_at)
          .toISOString()
          .split("T")[0]
      )
    )
  ].sort().reverse();

  let streak = 1;

  for (let i = 0; i < dates.length - 1; i++) {

    const current = new Date(dates[i]);
    const next = new Date(dates[i + 1]);

    const diff =
      (current - next) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

    const streak = calculateStreak();

    if(loading){
        return <p>Loading dashboard...</p>;
    }
    return (
        <div
            style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                maxWidth:"1200px",
                margin:"0 auto",
                padding:"30px 20px",
                width:"100%"
            }}
        >
        <h1 style={{fontSize:"32px",fontWeight:"600",marginBottom:"10px"}}>Dashboard</h1>

        <div
        style={{
            display:"flex",
            gap:"20px",
            flexWrap:"wrap"
        }}
        >
            <div style={{marginBottom:"20px"}}>

                {overdueTasks.length ===0 && upcomingTasks.length===0 && (
                    <p style={{fontSize: "16px", color:"red",fontWeight:"bold"}}>
                        ✅ No urgent deadlines as of now
                    </p>
                )}

                {overdueTasks.length>0 && (
                    <div style={{fontSize: "16px", padding:"10px 15px",borderRadius:"8px",background:"#fee2e2",color:"#b91c1c",marginBottom:"10px"}}>
                        ❗ {overdueTasks.length} task{overdueTasks.length>1?"s":""} overdue
                    </div>
                )}

                {upcomingTasks.length>0 && (
                    <div style={{fontSize: "16px", padding:"10px 15px",borderRadius:"8px",background:"#fef3c7",color:"#92400e"}}>
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
  <h3 style={{ fontSize: "20px" }}>🔥 Focus Today</h3>

  {aiInsights.focusToday?.map((task, index) => (
    <p key={index} style={{ fontSize: "16px" }}>• {task}</p>
  ))}

  <h3 style={{ fontSize: "20px", marginTop: "15px" }}>⚠️ Risk</h3>
  <p style={{ fontSize: "16px" }}>{aiInsights.risk}</p>

  <h3 style={{ fontSize: "20px", marginTop: "15px" }}>📊 Insight</h3>
  <p style={{ fontSize: "16px" }}>{aiInsights.insight}</p>
</div>

        <div style={{
            padding: "20px",
            borderRadius: "12px",
            background: darkMode ? "#1e293b" : "#ffffff",
            marginBottom: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
            }}
        >
            <h2 style={{ fontSize: "24px" }}>🔥 Productivity Score</h2>

            <h2 style={{
                fontSize: "38px",
                margin: "10px 0"
                }}>
                {productivityScore}/100
               </h2>

            <p style={{ fontSize: "16px" }}>
                Based on completed and overdue tasks
            </p>
            </div>

            <div
    style={{
    padding: "20px",
    borderRadius: "12px",
    background: darkMode ? "#1e293b" : "#ffffff",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
            }}  
            >
                <h2 style={{ fontSize: "24px" }}>🔥 Current Streak</h2>

                <h1 style={{
                fontSize:"38px",
                margin:"10px 0"
                }}>
                {streak} Days
            </h1>

               <p>
                Consecutive productive days
            </p>
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