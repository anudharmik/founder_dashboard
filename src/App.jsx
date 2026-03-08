import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
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

  async function getUser(){
          const {data}=await supabase.auth.getUser();
          setUser(data.user);
      }
  
      
  return (
    <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/goals" element={<Goals user={user} />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
      </Layout>
    </BrowserRouter>
  );
}
