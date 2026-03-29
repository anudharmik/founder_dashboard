import TaskList from "./TaskList";
import "../App.css";

export default function GoalCard({goal,tasks,taskInputs,setTaskInputs,addTask,toggleTask,deleteTask,deleteGoal,deadlineInputs,setDeadlineInputs}){
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

    

    return (
        <div style={{marginBottom :"30px"}}>
            <h3>{goal.title}</h3>
            <p>{goal.description}</p>
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

            <button onClick={()=>addTask(goal.id)}>Add Task</button>
            </div>

            <TaskList tasks={tasks} goalId={goal.id} toggleTask={toggleTask} deleteTask={deleteTask}/>
            <br/>

            <button
               style={{marginBottom:"10px" ,color:"red"}}
               onClick={()=>
                deleteGoal(goal.id)}
            >
                Delete the above goal entirely
            </button>
            <hr/>
        </div>
    )
}
