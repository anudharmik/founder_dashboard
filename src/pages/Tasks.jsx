import {useState} from "react";

export default function Tasks({tasks,goals,toggleTask}){
    const [filter,setFilter]=useState("all");
    const today=new Date();

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

    const sortedTasks=[...filteredTasks].sort((a,b)=>{
        if(!a.deadline)return -1;
        if(!b.deadline) return -1;
        return new Date(a.deadline)-new Date(b.deadline);
    });

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

    return (
    <>
    <h1>Tasks</h1>
    <div style={{marginBottom:"20px"}}>
        <button onClick={()=>setFilter("all")} style={{marginRight:"20px"}}>All</button>
        <button onClick={()=>setFilter("completed")} style={{marginRight:"20px"}}>Completed</button>
        <button onClick={()=>setFilter("pending")} style={{marginRight:"20px"}}>Pending</button>
        <button onClick={()=>setFilter("overdue")} style={{marginRight:"20px"}}>Overdue</button>
        <button onClick={()=>setFilter("dueSoon")} style={{marginRight:"20px"}}>Due soon</button>
    </div>

    <ul>
        {sortedTasks.map(task => (
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
    </>
    )
}