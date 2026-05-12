import {useState} from "react";

export default function Tasks({tasks,goals,toggleTask,loading,darkMode}){
    const [filter,setFilter]=useState("all");
    const today=new Date();
    const [sortByUrgency,setSortByUrgency]=useState(true);
    

    const filteredTasks=tasks.filter(task=>{
        if(filter==="completed")return task.completed;
        if(filter==="pending") return !task.completed;
        if(filter==="overdue"){
            if(!task.deadline || task.completed) return false;
            return new Date(task.deadline)<today;
        }

        if(filter==="dueSoon"){
            if(!task.deadline || task.completed)return false;
            const diff=
            (new Date(task.deadline)-today) /
            (1000*60**60*24);

            return diff>=0 && diff<=2;
        
        }
        return true;
    });

    function getPriority(task){
        if(task.completed)return 4;
        if(!task.cdeadline)return 3;
        const diff=
        (new Date(TaskList.deadline)-today)/
        (1000*60*60*24);
        if(diff<0)return 1;
        if(diff <= 2)return 2;
        return 3;
    }

    const sortedTasks=[...filteredTasks].sort((a,b)=>{
        return getPriority(a)-getPriority(b);
    });
    const displayedTasks=sortByUrgency?sortedTasks:filteredTasks;

    function getGoalTitle(goalId){
        const goal=goals.find(g=>g.id===goalId);
        return goal?goal.title:"Unknown";
    }

    function getDeadlineStatus(task){
        if(!task.deadline) return "";
        const deadlineDate=new Date(task.deadline);
        const diff=(deadlineDate-today)/(1000*64*60*24);

        if(task.completed) return "✅ Completed";
        if(diff<0) return "❗ Overdue";
        if(diff<=2) return "⚠️ Due soon";

        return `📅 Due on ${task.deadline.split("T")[0]}`;
    }

    const buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      marginLeft: "8px",
      transition: "all 0.2s ease"
    };

    return (
    <>
    {displayedTasks.length===0 && (
        <p style={{marginTop:"20px",color:"#6b7280"}}>
            No tasks found for this filter. 
        </p>
    )}

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>Tasks</h1>
        <button 
            style={{...buttonStyle, background: darkMode ? "#334155" : "#e2e8f0", color: darkMode ? "#f8fafc" : "#0f172a"}} 
            onClick={()=>setSortByUrgency(!sortByUrgency)}
            onMouseEnter={(e)=>e.target.style.background=darkMode ? "#475569" : "#cbd5e1"} 
            onMouseLeave={(e)=>e.target.style.background=darkMode ? "#334155" : "#e2e8f0"}
        >
            {sortByUrgency?"Sort by Deadline":"Sort by Urgency"}
        </button>
    </div>

    <div style={{marginBottom:"24px", display: "flex", gap: "10px", flexWrap: "wrap"}}>
        {["all", "completed", "pending", "overdue", "dueSoon"].map(f => (
            <button 
                key={f}
                style={{
                    ...buttonStyle, 
                    background: filter === f ? "#3b82f6" : (darkMode ? "#1e293b" : "#ffffff"),
                    color: filter === f ? "white" : (darkMode ? "#e2e8f0" : "#475569"),
                    border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }} 
                onClick={()=>setFilter(f)} 
            >
                {f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').trim()}
            </button>
        ))}
    </div>

    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        {displayedTasks.map(task => (
        <li key={task.id} style={{ 
            padding: "16px",
            borderRadius: "12px",
            background: darkMode ? "#1e293b" : "#ffffff",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}>
            <span
            style={{ cursor: "pointer", fontSize: "20px" }}
            onClick={() => toggleTask(task.id, task.completed)}
            >
            {task.completed ? "✅" : "⬜"}
            </span>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <b style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "14px", background: darkMode ? "#334155" : "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>{getGoalTitle(task.goal_id)}</b>
                    <span style={{ fontWeight: task.completed ? "400" : "500", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? (darkMode ? "#64748b" : "#94a3b8") : (darkMode ? "#f8fafc" : "#0f172a") }}>{task.title}</span>
                </div>
            </div>

            <span style={{
                fontSize:"13px", 
                fontWeight: "500",
                color: getDeadlineStatus(task).includes("Overdue") ? "#ef4444" : 
                       getDeadlineStatus(task).includes("Due soon") ? "#f59e0b" : 
                       (darkMode ? "#94a3b8" : "#64748b")
            }}>
                {getDeadlineStatus(task)}
            </span>
        </li>
        ))}
    </ul>
    {displayedTasks.length===0 && (
        <div style={{
            padding: "40px",
            textAlign: "center",
            background: darkMode ? "#1e293b" : "#ffffff",
            borderRadius: "16px",
            border: darkMode ? "1px dashed #334155" : "1px dashed #cbd5e1",
            marginTop: "20px"
        }}>
            <p style={{fontSize: "18px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0}}>
                No tasks found for this filter.
            </p>
        </div>
    )}
    </>
    )
}