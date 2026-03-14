export default function TaskItem({task,toggleTask,deleteTask}){
    return (
        <li>
        <span
        style={{cursor:"pointer"}}
        onClick={() => toggleTask(task.id,task.completed)}>

            {task.completed ? "✅" : "⬜"} {task.title}
        </span>
        <button onClick={() => deleteTask(task.id)} style={{marginLeft:"10px"}}>Delete</button>
        
        </li>
    );
}