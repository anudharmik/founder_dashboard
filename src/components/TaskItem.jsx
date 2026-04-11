import {useState} from "react";

export default function TaskItem({task,toggleTask,deleteTask,updateTask,darkMode}){
    const today=new Date();
    const deadlineDate=task.deadline?new Date(task.deadline):null;
    const [isEditing,setIsEditing]=useState(false);
    const [editedTitle,setEditedTitle]=useState(task.title);
    const [editedDeadline,setEditedDeadline]=useState(task.deadline?task.deadline.split("T")[0]:"");
    let color=darkMode?"#e2e8f0":"black";

    const buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      marginLeft: "8px"
    };

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
        <li style={{
            color,
            marginBottom:"10px",
            padding:"10px",
            borderRadius:"8px",
            background:darkMode?"#334155":"#f9fafb",
            boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>

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
            <button style={buttonStyle} onClick={handleSave}>Save</button>
            <button style={buttonStyle} onClick={()=>setIsEditing(false)}>Cancel</button>
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
        <button style={buttonStyle} onClick={()=>setIsEditing(true)} >Edit</button>
        <button style={{...buttonStyle,background:"#ef4444"}} onClick={() => deleteTask(task.id)} >Delete</button>
        </>
        )}
        </li>
    );
}