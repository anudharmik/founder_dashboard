import TaskItem from "./TaskItem";

export default function TaskList({tasks,goalId,toggleTask,deleteTask,updateTask,darkMode,aiInsights = { focusToday: [] }}){
    const filteredTasks=tasks.filter(task=>task.goal_id===goalId);
    const sortedTasks = [...filteredTasks].sort((a, b) => {

  const aFocus =
    aiInsights.focusToday?.some(
      title =>
        title.toLowerCase().trim() ===
        a.title.toLowerCase().trim()
    );

  const bFocus =
    aiInsights.focusToday?.some(
      title =>
        title.toLowerCase().trim() ===
        b.title.toLowerCase().trim()
    );

  // Focus tasks first
  if (aFocus && !bFocus) return -1;
  if (!aFocus && bFocus) return 1;

  return 0;
});

    
    return (
        <ul>

{sortedTasks.map((task) => {

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