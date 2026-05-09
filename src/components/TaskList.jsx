import TaskItem from "./TaskItem";

export default function TaskList({tasks,goalId,toggleTask,deleteTask,updateTask,darkMode,aiInsights}){
    const filteredTasks=tasks.filter(task=>task.goal_id===goalId);
    
    return (
        <ul>

{filteredTasks.map((task) => {

    const isFocusTask =
      aiInsights.focusToday?.includes(task.title);

    return (
      <TaskItem 
        key={task.id} 
        task={task} 
        toggleTask={toggleTask} 
        deleteTask={deleteTask}
        updateTask={updateTask}
        darkMode={darkMode}
        isFocusTask={isFocusTask}
      />
    );
})}
</ul>
);
}