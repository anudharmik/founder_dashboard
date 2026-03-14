import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';
import GoalCard from '../components/GoalCard'; 

export default function Goals({user}){
    
    
    const[goals,setgoals]=useState([]);
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    //for tasks
    const [tasks,setTasks]=useState([]);
    const [taskInputs,setTaskInputs]=useState("");

    

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
        const title=taskInputs[goalId];
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
                user_id: user.id
            }
        ]);


        if(!error){
            setTaskInputs({
                ...taskInputs,
                [goalId]:""
            });
            fetchTasks();
        }
    }

    async function toggleTask(taskId,completed){
        setTasks(prevTasks=>
            prevTasks.map(task =>
                task.id===taskId? {...task,completed:!completed}:task
            )
        );

        const{error}=await supabase
            .from("tasks")
            .update({completed:!completed})
            .eq("id",taskId);

            if(error){
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
                <GoalCard
                key={goal.id}
                goal={goal}
                tasks={tasks}
                taskInputs={taskInputs}
                setTaskInputs={setTaskInputs}
                addTask={addTask}
                toggleTask={toggleTask}
                />
            ))}
        </ul>

    </div>
    )
}