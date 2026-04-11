import TaskList from "./TaskList";
import "../App.css";
import {useState} from "react";

export default function GoalCard({goal,tasks,taskInputs,setTaskInputs,addTask,toggleTask,deleteTask,deleteGoal,deadlineInputs,setDeadlineInputs,updateTask,updateGoal,darkMode}){
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
            marginBottom :"20px",
            padding:"20px",
            borderRadius:"12px",
            background:darkMode?"#1e293b":"#ffffff",
            color:darkMode?"#e2e8f0":"#111827",
            boxShadow:darkMode?"0 4px 12px rgba(0,0,0,0.3)":"0 4px 12px rgba(0,0,0,0.08)"
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
                <h3>{goal.title}</h3>
                <p>{goal.description}</p>

                <button style={buttonStyle} onClick={()=>setIsEditingGoal(true)}>Edit Goal</button>
                
                </>
            )}

            
            <div
                style={{
                    height: "10px",
                    background: "#eee",
                    borderRadius: "6px",
                    margin: "10px 0"
                }}
            >
                <div
                    style={{
                    width: `${progress}%`,
                    background: "#4caf50",
                    height: "100%",
                    borderRadius: "6px"
                    }}
                />
            </div>

            <p>{progress}% complete</p>

            <div style={{marginBottom:"20px"}} className="container">
            <input 
            style={{marginRight:"20px"}}
            placeholder="New task"
            value = {taskInputs[goal.id] || ""}
            onChange={(e)=>
                setTaskInputs({
                    ...taskInputs,
                    [goal.id]:e.target.value
                })
            }
            />

            <h4>Deadline for the task: <input
              style={{marginRight:"20px"}}
              type="date"
              value={deadlineInputs[goal.id] || ""}
              onChange={(e)=>
                setDeadlineInputs({
                    ...deadlineInputs,
                    [goal.id]:e.target.value
                })
              }
            /></h4>

            <button style={buttonStyle} onClick={()=>addTask(goal.id)}>Add Task</button>
            </div>

            <TaskList tasks={tasks} goalId={goal.id} toggleTask={toggleTask} deleteTask={deleteTask} updateTask={updateTask} darkMode={darkMode}/>
            <br/>

            <button
               style={{...buttonStyle,background:"#ef4444"}}
               onClick={()=>
                deleteGoal(goal.id)}
            >
                Delete the above goal entirely
            </button>
            <hr/>
        </div>
    )
}
