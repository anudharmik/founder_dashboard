import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';

export default function Goals({user}){
    
    
    const[goals,setgoals]=useState([]);
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    //for tasks
    const [tasks,setTasks]=useState([]);
    const [taskTitle,setTaskTitle]=useState("");

    

    useEffect(()=>{
        fetchGoals();
        fetchTasks();
    },[]);

    
    async function fetchGoals(){
        const {data,error}=await supabase
        .from("goals")
        .select("*")
        .order("created_at",{ascending:false});

        if(!error){
            setgoals(data);
        }
    }

    async function fetchTasks(){
        const {data,error}= await supabase
        .from("tasks")
        .select("*")
        .order("created_at", {ascending:false});

        if(!error){
            setTasks(data);
        }
    }

        
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
        const {error} =await supabase
        .from("tasks")
        .insert([
            {
                title: taskTitle,
                goal_id: goalId,
                completed: false,
                user_id: user.id
            }
        ]);

        if(!error){
            setTaskTitle("");
            fetchTasks();
        }
    }

    return (
    <div>
        <h1>Goals</h1>

        <form onSubmit={handleSubmit}>
            <input 
            placeholder="Goal title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            />

            <input
            placeholder="Description"
            value={description}
            onChange={(e)=>setDescription(e.target.value)}
            />

            <button type="submit">Add Goal</button>
        </form>

        <ul>
            {goals.map(goal => (
                <li key={goal.id} style={{marginBottom:"20px"}}>
                    <b>{goal.title}</b> — {goal.description}
                    <div style={{marginTop:"10px"}}>
                        <input
                        placeholder="Task title"
                        value={taskTitle}
                        onChange={(e)=>setTaskTitle(e.target.value)}
                        />
                        <button onClick={()=>addTask(goal.id)}>Add Task</button>
                    </div>
                    <ul>
                        {tasks.filter(task=>taskTitle.goil_id ==goal.id)
                        .map(task => (
                            <li key={task.id}>
                                {task.completed ? "✅" : "⬜"} {task.title}
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>

    </div>
    )
}