import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';
import GoalCard from '../components/GoalCard'; 

export default function Goals({user,goals,tasks,fetchGoals,fetchTasks}){
    
    
    
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    const [taskInputs,setTaskInputs]=useState("");

    
    
    // async function fetchGoals(){
    //     const {data,error}=await supabase
    //     .from("goals")
    //     .select("*")
    //     .order("created_at",{ascending:false});

    //     if(!error){
    //         setgoals(data);
    //     }
    // }

    // async function fetchTasks(){
    //     const {data,error}= await supabase
    //     .from("tasks")
    //     .select("*")
    //     .order("created_at", {ascending:false});

    //     if(!error){
    //         setTasks(data);
    //     }
    // }

        
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
                deleteTask={deleteTask}
                deleteGoal={deleteGoal}
                />
            ))}
        </ul>

    </div>
    )
}