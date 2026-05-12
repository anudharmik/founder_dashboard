import TaskList from "./TaskList";
import "../App.css";
import {useState} from "react";

export default function GoalCard({goal,tasks,taskInputs,setTaskInputs,addTask,toggleTask,deleteTask,deleteGoal,deadlineInputs,setDeadlineInputs,updateTask,updateGoal,darkMode,aiInsights}){
    const [isEditingGoal,setIsEditingGoal]=useState(false);
    const [editedGoalTitle,setEditedGoalTitle]=useState(goal.title);
    const [editedGoalDescription,setEditedGoalDescription]=useState(goal.description);
    const goalTasks = tasks.filter(
    task => task.goal_id === goal.id
    );

    const completedTasks = goalTasks.filter(
    task => task.completed
    );

    const progress =
    goalTasks.length === 0
        ? 0
        : Math.round(
            (completedTasks.length / goalTasks.length) * 100);

    async function handleSaveGoal(){
        await updateGoal(goal.id,editedGoalTitle,editedGoalDescription);
        setIsEditingGoal(false);
    }

    const buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      marginLeft: "8px"
    };
    

    return (
        <div style={{
            marginBottom :"24px",
            padding:"24px",
            borderRadius:"16px",
            background:darkMode?"#1e293b":"#ffffff",
            color:darkMode?"#e2e8f0":"#111827",
            boxShadow:darkMode?"0 4px 20px rgba(0,0,0,0.4)":"0 4px 20px rgba(0,0,0,0.05)",
            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
            transition: "all 0.3s ease"
        }}>
            {isEditingGoal?(
                <>
                <input
                value={editedGoalTitle}
                onChange={(e)=>setEditedGoalTitle(e.target.value)}
                />
                <textarea
                value={editedGoalDescription}
                onChange={(e)=>setEditedGoalDescription(e.target.value)}
                />
                <button style={buttonStyle} onClick={handleSaveGoal}>Save</button>
                <button style={buttonStyle} onClick={()=>setIsEditingGoal(false)}>Cancel</button>
                </>

            ):(
                <>
                <h2>{goal.title}</h2>
                <p>{goal.description}</p>

                <button style={buttonStyle} onClick={()=>setIsEditingGoal(true)}>Edit Goal</button>
                
                </>
            )}

            
            <div
                style={{
                    height: "10px",
                    background: darkMode ? "#334155" : "#e2e8f0",
                    borderRadius: "8px",
                    margin: "16px 0 8px 0",
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                    width: `${progress}%`,
                    background: "linear-gradient(to right, #22c55e, #10b981)",
                    height: "100%",
                    borderRadius: "8px",
                    transition: "width 0.5s ease-out"
                    }}
                />
            </div>

            <p style={{ fontSize: "14px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", marginBottom: "20px" }}>{progress}% complete</p>

            <div style={{
                marginBottom:"24px", 
                display: "flex", 
                flexWrap: "wrap", 
                gap: "12px", 
                alignItems: "center",
                background: darkMode ? "#334155" : "#f8fafc",
                padding: "16px",
                borderRadius: "12px"
            }} className="container">
            <input 
            style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                background: darkMode ? "#1e293b" : "#ffffff",
                color: darkMode ? "#f8fafc" : "#0f172a",
                outline: "none",
                flex: "1 1 200px"
            }}
            placeholder="New task"
            value = {taskInputs[goal.id] || ""}
            onChange={(e)=>
                setTaskInputs({
                    ...taskInputs,
                    [goal.id]:e.target.value
                })
            }
            />

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "500", color: darkMode ? "#cbd5e1" : "#475569" }}>Deadline:</span> 
                <input
                style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: darkMode ? "1px solid #475569" : "1px solid #cbd5e1",
                    background: darkMode ? "#1e293b" : "#ffffff",
                    color: darkMode ? "#f8fafc" : "#0f172a",
                    outline: "none",
                    cursor: "pointer"
                }}
                type="date"
                value={deadlineInputs[goal.id] || ""}
                onChange={(e)=>
                    setDeadlineInputs({
                        ...deadlineInputs,
                        [goal.id]:e.target.value
                    })
                }
                />
            </div>

            <button style={{...buttonStyle, background: "#10b981"}} onClick={()=>addTask(goal.id)}>Add Task</button>
            </div>
            <h3 style={{ fontSize: "18px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📝</span> Tasks for this goal
            </h3>
            <TaskList tasks={tasks} goalId={goal.id} toggleTask={toggleTask} deleteTask={deleteTask} updateTask={updateTask} darkMode={darkMode} aiInsights={aiInsights}/>
            
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button
                style={{
                    ...buttonStyle,
                    background:"transparent",
                    border: "1px solid #ef4444",
                    color: "#ef4444"
                }}
                onMouseEnter={(e)=>{e.target.style.background="#ef4444"; e.target.style.color="white";}}
                onMouseLeave={(e)=>{e.target.style.background="transparent"; e.target.style.color="#ef4444";}}
                onClick={()=>
                    deleteGoal(goal.id)}
                >
                    Delete Goal
                </button>
            </div>
        </div>
    )
}
