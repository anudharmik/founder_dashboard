import TaskItem from "./TaskItem";

export default function TaskList({tasks,goalId,toggleTask}){
    const filteredTasks=tasks.filter(task=>task.goal_id===goalId);
    return (
        <ul>
            {filteredTasks.map((task)=>(
                <TaskItem 
                key={task.id} 
                task={task} 
                toggleTask={toggleTask} 
                />
            ))}
        </ul>
    );
}