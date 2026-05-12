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
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-insights`, {
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
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <p style={{ fontSize: "18px", fontWeight: "500", color: darkMode ? "#94a3b8" : "#64748b" }}>
                    Loading dashboard...
                </p>
            </div>
        );
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
            <div style={{marginBottom:"20px", display: "flex", flexDirection: "column", gap: "12px"}}>

                {overdueTasks.length ===0 && upcomingTasks.length===0 && (
                    <div style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        background: darkMode ? "rgba(34, 197, 94, 0.1)" : "#dcfce7",
                        color: darkMode ? "#4ade80" : "#166534",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                        <span style={{ fontSize: "20px" }}>✅</span>
                        <p style={{fontSize: "16px", fontWeight:"600", margin: 0}}>
                            No urgent deadlines as of now. You're all caught up!
                        </p>
                    </div>
                )}

                {overdueTasks.length>0 && (
                    <div style={{
                        fontSize: "16px", 
                        padding:"16px 20px",
                        borderRadius:"12px",
                        background: darkMode ? "rgba(239, 68, 68, 0.1)" : "#fee2e2",
                        color: darkMode ? "#f87171" : "#b91c1c",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                        <span style={{ fontSize: "20px" }}>❗</span>
                        <p style={{ margin: 0, fontWeight: "600" }}>{overdueTasks.length} task{overdueTasks.length>1?"s":""} overdue</p>
                    </div>
                )}

                {upcomingTasks.length>0 && (
                    <div style={{
                        fontSize: "16px", 
                        padding:"16px 20px",
                        borderRadius:"12px",
                        background: darkMode ? "rgba(245, 158, 11, 0.1)" : "#fef3c7",
                        color: darkMode ? "#fbbf24" : "#92400e",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                        <span style={{ fontSize: "20px" }}>⚠️</span>
                        <p style={{ margin: 0, fontWeight: "600" }}>{upcomingTasks.length} task{upcomingTasks.length>1?"s":""} due soon</p>
                    </div>
                )}
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
                marginBottom: "24px"
            }}>
                <div
                    style={{
                        padding: "24px",
                        borderRadius: "16px",
                        background: darkMode ? "#1e293b" : "#ffffff",
                        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
                        border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <h3 style={{ fontSize: "20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>🔥</span> Focus Today
                    </h3>

                    {aiInsights.focusToday?.map((task, index) => (
                        <div key={index} style={{ 
                            fontSize: "15px", 
                            padding: "10px", 
                            background: darkMode ? "#334155" : "#f8fafc", 
                            borderRadius: "8px",
                            marginBottom: "8px"
                        }}>
                            • {task}
                        </div>
                    ))}

                    <h3 style={{ fontSize: "18px", marginTop: "20px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>⚠️</span> Risk
                    </h3>
                    <p style={{ fontSize: "15px", color: darkMode ? "#cbd5e1" : "#475569", lineHeight: "1.5" }}>{aiInsights.risk}</p>

                    <h3 style={{ fontSize: "18px", marginTop: "20px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>📊</span> Insight
                    </h3>
                    <p style={{ fontSize: "15px", color: darkMode ? "#cbd5e1" : "#475569", lineHeight: "1.5" }}>{aiInsights.insight}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div style={{
                        padding: "24px",
                        borderRadius: "16px",
                        background: darkMode ? "#1e293b" : "#ffffff",
                        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
                        border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        flex: 1
                        }}
                    >
                        <h2 style={{ fontSize: "20px", color: darkMode ? "#94a3b8" : "#64748b" }}>Productivity Score</h2>
                        <h2 style={{
                            fontSize: "48px",
                            fontWeight: "800",
                            margin: "16px 0",
                            color: darkMode ? "#f8fafc" : "#0f172a"
                            }}>
                            {productivityScore}/100
                        </h2>
                        <p style={{ fontSize: "14px", color: darkMode ? "#94a3b8" : "#64748b" }}>
                            Based on completed and overdue tasks
                        </p>
                    </div>

                    <div style={{
                        padding: "24px",
                        borderRadius: "16px",
                        background: darkMode ? "#1e293b" : "#ffffff",
                        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
                        border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        flex: 1
                        }}  
                    >
                        <h2 style={{ fontSize: "20px", color: darkMode ? "#94a3b8" : "#64748b" }}>Current Streak</h2>
                        <h1 style={{
                            fontSize:"48px",
                            fontWeight: "800",
                            margin:"16px 0",
                            color: darkMode ? "#f8fafc" : "#0f172a"
                        }}>
                            {streak} Days
                        </h1>
                        <p style={{ fontSize: "14px", color: darkMode ? "#94a3b8" : "#64748b" }}>
                            Consecutive productive days
                        </p>
                    </div>
                </div>
            </div>

            <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
                gap:"24px",
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