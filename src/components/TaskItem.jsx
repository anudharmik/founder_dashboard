import {useState} from "react";

export default function TaskItem({task,toggleTask,deleteTask,updateTask}){
    const today=new Date();
    const deadlineDate=task.deadline?new Date(task.deadline):null;
    const [isEditing,setIsEditing]=useState(false);
    const [editedTitle,setEditedTitle]=useState(task.title);
    const [editedDeadline,setEditedDeadline]=useState(task.deadline?task.deadline.split("T")[0]:"");
    let color="black";

    if(deadlineDate){
        const diff=(deadlineDate-today)/(1000*60*60*24);

        if(diff<0){
            color="red";
        }else if(diff<=2){
            color="orange"
        }
    }

    async function handleSave(){
        await updateTask(task.id,editedTitle,editedDeadline);
        setIsEditing(false);
    }

    return (
        <li style={{color,marginBottom:"10px"}}>
            {isEditing ? (
            <>
            <input
            type="text"
            value={editedTitle}
            onChange={(e)=>setEditedTitle(e.target.value)}
            />
            <input
            type="date"
            value={editedDeadline}
            onChange={(e)=>setEditedDeadline(e.target.value)}
            />
            <button onClick={handleSave}>Save</button>
            <button onClick={()=>setIsEditing(false)}>Cancel</button>
            </>
        ) : (
            <>
        <span
        style={{color,cursor:"pointer"}}
        onClick={() => toggleTask(task.id,task.completed)}>

            {task.completed ? "✅" : "⬜"} {task.title}
        </span>

        {task.deadline && (
        <span style={{ marginLeft: "10px", fontSize: "12px" }}>
            (Due: {task.deadline.split("T")[0]})
        </span>
        )}
        <button onClick={()=>setIsEditing(true)} style={{marginLeft:"10px"}}>Edit</button>
        <button onClick={() => deleteTask(task.id)} style={{marginLeft:"10px"}}>Delete</button>
        </>
        )}
        </li>
    );
}