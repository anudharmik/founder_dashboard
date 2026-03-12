export default function TaskItem({task}){
    return (
        <li>
            {task.completed ? "✅" : "⬜"} {task.title}
        </li>
    );
}