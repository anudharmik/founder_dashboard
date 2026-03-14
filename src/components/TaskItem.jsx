export default function TaskItem({task,toggleTask}){
    return (
        <li
        style={{cursor:"pointer"}}
        onClick={() => toggleTask(task.id,task.completed)}>

            {task.completed ? "✅" : "⬜"} {task.title}
        </li>
    );
}