import TaskItem from "./TaskItem";

export default function TaskList({tasks,goalId,toggleTask,deleteTask,updateTask,darkMode,aiInsights = { focusToday: [] }}){
    const filteredTasks=tasks.filter(task=>task.goal_id===goalId);
    const checkFocus = (task) => 
      aiInsights.focusToday?.some(
        title => title.toLowerCase().trim() === task.title.toLowerCase().trim()
      );
    const focusTasks = filteredTasks.filter(task => checkFocus(task));
    const regularTasks = filteredTasks.filter(task => !checkFocus(task));
    const sortedTasks = [...focusTasks, ...regularTasks];

    
    return (
        <ul>

{sortedTasks.map((task) => {

    const isFocusTask = checkFocus(task);

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