import {useState,useEffect} from 'react';
import {supabase} from '../supabaseClient';

export default function Goals({user}){
    
    
    const[goals,setgoals]=useState([]);
    const[title,setTitle]=useState("");
    const[description,setDescription]=useState("");

    

    useEffect(()=>{
        fetchGoals();
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
                <li key={goal.id}>
                    <b>{goal.title}</b> — {goal.description}
                </li>
            ))}
        </ul>

    </div>
    )
}