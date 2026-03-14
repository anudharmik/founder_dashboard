import TaskList from "./TaskList";



export default function GoalCard({goal,tasks,taskInputs,setTaskInputs,addTask,toggleTask}){
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

            <input 
            placeholder="New task"
            value = {taskInputs[goal.id] || ""}
            onChange={(e)=>
                setTaskInputs({
                    ...taskInputs,
                    [goal.id]:e.target.value
                })
            }
            />
            <button onClick={()=>addTask(goal.id)}>Add Task</button>
            <TaskList tasks={tasks} goalId={goal.id} toggleTask={toggleTask}/>
        </div>
    )
}
