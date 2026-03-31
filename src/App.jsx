import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import {supabase} from "./supabaseClient";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";

export default function App() {
  const[user,setUser]=useState(null);
  const[goals,setGoals]=useState([]);
  const[tasks,setTasks]=useState([]);

  useEffect(()=>{
      getUser();
      fetchGoals();
      fetchTasks();
  },[]);

  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
  });
  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

    return () => {
      listener.subscription.unsubscribe();
    };
    }, []);

  async function getUser(){
          const {data}=await supabase.auth.getUser();
          setUser(data.user);
      }

  async function fetchGoals(){
    const{data}=await supabase
    .from("goals")
    .select("*")
    .order("created_at",{ascending:false});

    setGoals(data || []);
  }

  async function fetchTasks(){
    const {data}=await supabase
    .from("tasks")
    .select("*")
    .order("created_at",{ascending:false});

    setTasks(data || []);
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

    async function updateTask(taskId, newTitle, newDeadline) {
    const { error } = await supabase
      .from("tasks")
      .update({
        title: newTitle,
        deadline: newDeadline || null
      })
      .eq("id", taskId);

    if (!error) {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, title: newTitle, deadline: newDeadline || null }
            : task
        )
      );
    } else {
      fetchTasks();
    }
  }


  if(!user){
    return <Login />
  }
  return (
    <div>
    <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard user={user} goals={goals} tasks={tasks}/>} />
        <Route path="/goals" element={<Goals user={user} goals={goals} tasks={tasks} setTasks={setTasks} fetchGoals={fetchGoals} fetchTasks={fetchTasks} toggleTask={toggleTask} updateTask={updateTask}/>} />
        <Route path="/tasks" element={<Tasks user={user} tasks={tasks} goals={goals} toggleTask={toggleTask}/>} />
        <Route path="/projects" element={<Projects user={user}/>} />
        <Route path="/analytics" element={<Analytics user={user} goals={goals} tasks={tasks}/>} />
      </Routes>
      </Layout>
    </BrowserRouter>
    </div>
  );
}
