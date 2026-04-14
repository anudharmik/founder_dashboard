import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';
import GoalCard from '../components/GoalCard'; 
import {useRef} from 'react';

export default function Goals({user,goals,tasks,setTasks,fetchGoals,fetchTasks,toggleTask,updateTask,updateGoal,darkMode,loading}){
    
    
    
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    const [taskInputs,setTaskInputs]=useState({});
    const [deadlineInputs,setDeadlineInputs]=useState({});
    
    const taskInputRef=useRef(null);

    useEffect(()=>{
    taskInputRef.current?.focus();
    },[]); 

    async function handleSubmit(e){
        e.preventDefault();
        if(!user){
            alert("you must be logged in");
            return;
        }

        const{error}=await supabase
        .from("goals")
        .insert([
            {title,
            description,
            progress:0,
            status:"active",
            user_id: user.id,
            }
        ]);

        if(!error){
            setTitle("");
            setDescription("");
            fetchGoals();
        }
    }

    async function addTask(goalId){
        const title=taskInputs[goalId];
        const deadline=deadlineInputs[goalId];

        if(!title){
            return;
        }
        const {error} =await supabase
        .from("tasks")
        .insert([
            {
                title,
                goal_id: goalId,
                completed: false,
                user_id: user.id,
                deadline:deadline || null
            }
        ]);
        if(!error){
            setTaskInputs({
                ...taskInputs,
                [goalId]:""
            })
            setDeadlineInputs({
                ...deadlineInputs,
                [goalId]:""
            });
            fetchTasks();
        }
    }



    async function deleteTask(taskId){
        const {error}=await supabase
        .from("tasks")
        .delete()
        .eq("id",taskId);

        if(!error){
            setTasks(prev=>prev.filter(task=> task.id!==taskId));
        }
    }

    async function deleteGoal(goalId){
        console.log("Deleting goal with ID:", goalId); // Debugging log
        const {error:taskError}= await supabase
        .from("tasks")
        .delete()
        .eq("goal_id",goalId);
        if(taskError){
            console.error("Error deleting tasks for goal:", taskError);
        }

        const {error:goalError}=await supabase
        .from("goals")
        .delete()
        .eq("id",goalId);
        if(goalError){
            console.error("Error deleting goal:", goalError);
        }
        if(!goalError){
            fetchGoals();
            fetchTasks();
        }
    }

    const buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      marginLeft: "8px",
      transition: "all 0.2s ease"
    };

    return (
    <div
    style={{
        maxWidth:"1100px",
        margin:"0 auto",
        padding:"20px"
    }}
    >
        {goals.length===0 && (
            <p style={{marginTop:"20px",color:"#6b7280"}}>
                No goals yet. Start by adding one 📈
            </p>
        )}

        <h1>Goals</h1>

        <form onSubmit={handleSubmit}>
            <input 
            ref={taskInputRef}
            placeholder="Goal title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            />

            <input
            placeholder="Description"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            />

            <button style={buttonStyle} type="submit">Add Goal</button>
        </form>

        <ul>
            {goals.map(goal => (
                <GoalCard
                key={goal.id}
                goal={goal}
                tasks={tasks}
                taskInputs={taskInputs}
                setTaskInputs={setTaskInputs}
                addTask={addTask}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                deleteGoal={deleteGoal}
                deadlineInputs={deadlineInputs}
                setDeadlineInputs={setDeadlineInputs}
                updateTask={updateTask}
                updateGoal={updateGoal}
                darkMode={darkMode}
                />

            ))}
        </ul>

    </div>
    )
}