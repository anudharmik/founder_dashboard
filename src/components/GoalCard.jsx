import TaskList from "./TaskList";

export default function GoalCard({goal,tasks,taskInputs,setTaskInputs,addTask }){
    return (
        <div style={{marginBottom :"30px"}}>
            <h3>{goal.title}</h3>
            <p>{goal.description}</p>

            <input 
            placeholder="New task"
            value = {TaskInput[goal.id] || ""}
            onChange={(e)=>
                setTaskInputs({
                    ...taskInputs,
                    [goal.id]:e.target.value
                })
            }
            />
            <button onClick={()=>addTask(goal.id)}>Add Task</button>
            <TaskList tasks={tasks} goalId={goal.id} />
        </div>
    )
}
