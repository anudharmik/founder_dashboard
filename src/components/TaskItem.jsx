import {useState} from "react";

export default function TaskItem({task,toggleTask,deleteTask,updateTask,darkMode,isFocusTask}){
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
            marginBottom:"12px",
            padding:"16px",
            borderRadius:"12px",
            border: isFocusTask
            ? "2px solid #f59e0b"
            : (darkMode ? "1px solid #334155" : "1px solid #e2e8f0"),
            boxShadow: darkMode ? "0 4px 12px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.05)",
            background: isFocusTask
            ? (darkMode ? "#452d08" : "#fef3c7")
            : (darkMode ? "#1e293b" : "#ffffff"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            transition: "all 0.2s ease"
            }}>

            {isEditing ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", width: "100%", alignItems: "center" }}>
                <input
                type="text"
                value={editedTitle}
                onChange={(e)=>setEditedTitle(e.target.value)}
                style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                    background: darkMode ? "#0f172a" : "#ffffff",
                    color: darkMode ? "#f8fafc" : "#0f172a",
                    flex: 1,
                    minWidth: "200px"
                }}
                />
                <input
                type="date"
                value={editedDeadline}
                onChange={(e)=>setEditedDeadline(e.target.value)}
                style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                    background: darkMode ? "#0f172a" : "#ffffff",
                    color: darkMode ? "#f8fafc" : "#0f172a"
                }}
                />
                <button style={{...buttonStyle, background: "#10b981"}} onClick={handleSave}>Save</button>
                <button style={{...buttonStyle, background: "#64748b"}} onClick={()=>setIsEditing(false)}>Cancel</button>
            </div>
        ) : (
            <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <span
                style={{ cursor:"pointer", fontSize: "20px" }}
                onClick={() => toggleTask(task.id,task.completed)}>
                    {task.completed ? "✅" : "⬜"}
                </span>

                <span style={{ 
                    fontWeight: task.completed ? "400" : "500",
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? (darkMode ? "#64748b" : "#94a3b8") : color
                }}>
                    {task.title}
                    {isFocusTask && (
                    <span
                        style={{
                        marginLeft: "10px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background: "#f59e0b",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px"
                        }}
                    >
                        🔥 Focus
                    </span>
                    )}
                </span>

                {task.deadline && (
                <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: "500", color: color === "red" || color === "orange" ? color : (darkMode ? "#94a3b8" : "#64748b") }}>
                    (Due: {task.deadline.split("T")[0]})
                </span>
                )}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
                <button style={{...buttonStyle, background: darkMode ? "#475569" : "#cbd5e1", color: darkMode ? "#f8fafc" : "#0f172a"}} onClick={()=>setIsEditing(true)} >Edit</button>
                <button style={{...buttonStyle,background:"#ef4444"}} onClick={() => deleteTask(task.id)} >Delete</button>
            </div>
        </>
        )}
        </li>
    );
}