import {useState} from "react";

export default function Tasks({tasks,goals,toggleTask}){
    const [filter,setFilter]=useState("all");

    const filteredTasks=tasks.filter(task=>{
        if(filter==="completed")return task.completed;
        if(filter==="pending") return !task.completed;
        return true;
    });

    function getGoalTitle(goalId){
        const goal=goals.find(g=>g.id===goalId);
        return goal?goal.title:"Unknown";
    }

    return (
    <>
    <h1>Tasks</h1>
    <div style={{marginBottom:"20px"}}>
        <button onClick={()=>setFilter("all")} style={{marginRight:"20px"}}>All</button>
        <button onClick={()=>setFilter("completed")} style={{marginRight:"20px"}}>Completed</button>
        <button onClick={()=>setFilter("pending")} style={{marginRight:"20px"}}>Pending</button>
    </div>

    <ul>
        {filteredTasks.map(task => (
        <li key={task.id} style={{ marginBottom: "10px" }}>

        <b>[{getGoalTitle(task.goal_id)}]</b> — {task.title}
        <span
        style={{ cursor: "pointer", marginLeft: "10px" }}
        onClick={() => toggleTask(task.id, task.completed)}
        >
        {task.completed ? "✅" : "⬜"}
        </span>

        </li>
        ))}
    </ul>
    </>
    )
}