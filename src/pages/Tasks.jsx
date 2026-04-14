import {useState} from "react";

export default function Tasks({tasks,goals,toggleTask,loading}){
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

    <h1>Tasks</h1>
    <div style={{marginBottom:"20px"}}>
        <button style={buttonStyle} onClick={()=>setFilter("all")} >All</button>
        <button style={buttonStyle} onClick={()=>setFilter("completed")} >Completed</button>
        <button style={buttonStyle} onClick={()=>setFilter("pending")} >Pending</button>
        <button style={buttonStyle} onClick={()=>setFilter("overdue")} >Overdue</button>
        <button style={buttonStyle} onClick={()=>setFilter("dueSoon")} >Due soon</button>
    </div>

    <ul>
        <button onClick={()=>setSortByUrgency(!sortByUrgency)}>
            {sortByUrgency?"Sort by Deadline":"Sort by Urgency"}
        </button>
        {displayedTasks.map(task => (
        <li key={task.id} style={{ marginBottom: "10px" }}>

        <b>[{getGoalTitle(task.goal_id)}]</b> — {task.title}
        <span
        style={{ cursor: "pointer", marginLeft: "10px" }}
        onClick={() => toggleTask(task.id, task.completed)}
        >
        {task.completed ? "✅" : "⬜"}
        </span>
        <span style={{marginLeft:"10px",fontSize:"12px"}}>
            {getDeadlineStatus(task)}
        </span>
        </li>
        ))}
    </ul>
    {displayedTasks.length===0 && (
        <p style={{marginTop:"20px",color:"#6b7280"}}>
            No tasks found for this filter.
        </p>
    )}
    </>
    )
}