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

  useEffect(()=>{
      getUser();
      
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
  
  if(!user){
    return <Login />
  }
  return (
    <div>
    <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard user={user}/>} />
        <Route path="/goals" element={<Goals user={user} />} />
        <Route path="/tasks" element={<Tasks user={user}/>} />
        <Route path="/projects" element={<Projects user={user}/>} />
        <Route path="/analytics" element={<Analytics user={user}/>} />
      </Routes>
      </Layout>
    </BrowserRouter>
    </div>
  );
}
