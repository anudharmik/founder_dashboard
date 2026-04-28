import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {supabase} from "./supabaseClient";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const[user,setUser]=useState(null);
  const[goals,setGoals]=useState([]);
  const[tasks,setTasks]=useState([]);
  const[darkMode,setDarkMode]=useState(false);
  const[loading,setLoading]=useState(true);
  const[projects,setProjects]=useState([]);

  useEffect(()=>{
      getUser();
      fetchGoals();
      fetchTasks();
      fetchProjects();
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



function AppContent({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {

      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "g") navigate("/goals");
      if (e.key === "t") navigate("/tasks");
      if (e.key === "d") navigate("/");
      if (e.key === "n") navigate("/goals");

    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return children;
}

  async function getUser(){
          const {data}=await supabase.auth.getUser();
          setUser(data.user);
      }

    

  async function fetchGoals(customUserId){
    setLoading(true);
    const authData = await supabase.auth.getUser();
    const id = customUserId || authData.data.user?.id;
    if (!id) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const{data}=await supabase
    .from("goals")
    .select("*")
    .eq("user_id", id)
    .order("created_at",{ascending:false});

    setGoals(data || []);
    setLoading(false);
  }

  async function fetchTasks(customUserId){
    setLoading(true);
    const authData = await supabase.auth.getUser();
    const id = customUserId || authData.data.user?.id;
    if (!id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const {data}=await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", id)
    .order("created_at",{ascending:false});

    setTasks(data || []);
    setLoading(false);
  }



  async function toggleTask(taskId, completed) {

    const newCompleted = !completed;

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: newCompleted,
              completed_at: newCompleted ? new Date().toISOString() : null
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      .eq("id", taskId);

    if (error) {
      fetchTasks();
    }
  }

  async function fetchProjects() {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

    setProjects(data || []);
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

  async function updateGoal(goalId,newTitle,newDescription){
    const {error}=await supabase
      .from("goals")
      .update({
        title:newTitle,
        description:newDescription
      })
      .eq("id",goalId);

      if(!error){
        setGoals(prev=>
          prev.map(goal=>
            goal.id===goalId?{...goal,title:newTitle,description:newDescription}:goal
          )
        );
      }else{
        fetchGoals();
      }

  }


  const isResetPath = window.location.pathname === '/reset-password';

  if (isResetPath) {
    return <ResetPassword />
  }

  if(!user){
    return <Login />
  }
  return (
    <div style={{background:darkMode?"#0f172a":"#f3f4f6",
      color:darkMode?"white":"black",
      minHeight:"100vh",
      transition:"all 0.3s ease"   
       
    }}>
      
      <button onClick={()=>setDarkMode(!darkMode)}>
        {darkMode? "Light Mode" : "Dark Mode"}
      </button>
    <BrowserRouter>
    <Layout darkMode={darkMode}>
      <div style={{flex:1}}>
      <AppContent>
      <Routes>
        <Route path="/" element={<Dashboard user={user} goals={goals} tasks={tasks} darkMode={darkMode} loading={loading}/>} />
        <Route path="/goals" element={<Goals user={user} goals={goals} tasks={tasks} projects={projects} setTasks={setTasks} fetchGoals={fetchGoals} fetchTasks={fetchTasks} toggleTask={toggleTask} updateTask={updateTask} updateGoal={updateGoal} darkMode={darkMode} loading={loading}/>} />
        <Route path="/tasks" element={<Tasks user={user} tasks={tasks} goals={goals} toggleTask={toggleTask} darkMode={darkMode} loading={loading}/>} />
        <Route path="/projects" element={<Projects user={user} darkMode={darkMode} loading={loading} projects={projects} fetchProjects={fetchProjects} goals={goals} tasks={tasks}/>} />
        <Route path="/analytics" element={<Analytics user={user} goals={goals} tasks={tasks} darkMode={darkMode} loading={loading}/>} />
      </Routes>
      </AppContent>
      </div>
      </Layout>
    </BrowserRouter>
    </div>
  );
}
