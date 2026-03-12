export default function TaskItem({task}){
    return (
        <li
        style={{cursor:"pointer"}}
        onClick={() => toggleTask(task.id,task.completed)}>

            {task.completed ? "✅" : "⬜"} {task.title}
        </li>
    );
}