export default function TaskItem({task,toggleTask,deleteTask}){
    const today=new Date();
    const deadlineDate=task.deadline?new Date(task.deadline):null;

    let color="black";

    if(deadlineDate){
        const diff=(deadlineDate-today)/(1000*60*60*24);

        if(diff<0){
            color="red";
        }else if(diff<=2){
            color="orange"
        }
    }
    return (
        <li>
        <span
        style={{color,cursor:"pointer"}}
        onClick={() => toggleTask(task.id,task.completed)}>

            {task.completed ? "✅" : "⬜"} {task.title}
        </span>

        {task.deadline && (
        <span style={{ marginLeft: "10px", fontSize: "12px" }}>
            (Due: {task.deadline.split("T")[0]})
        </span>
        )}
        
        <button onClick={() => deleteTask(task.id)} style={{marginLeft:"10px"}}>Delete</button>
        
        </li>
    );
}