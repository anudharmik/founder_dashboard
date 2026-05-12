import { useState } from "react";
import { supabase } from "../supabaseClient";
import {useNavigate} from "react-router-dom"


export default function Projects({ user,projects,fetchProjects,darkMode,loading,goals,tasks}) {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate=useNavigate();

  async function createProject(e) {
    e.preventDefault();

    const { error } = await supabase
      .from("projects")
      .insert([
        {
          title,
          description,
          user_id: user.id
        }
      ]);

    if (!error) {
      setTitle("");
      setDescription("");
      fetchProjects();
    }
  }

  if (!projects || !goals || !tasks) return null;
  return (
    
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ margin: "0 0 24px 0", fontSize: "32px", fontWeight: "700" }}>Projects</h1>

      <form onSubmit={createProject} style={{ 
            display: "flex", 
            gap: "16px", 
            marginBottom: "30px", 
            flexWrap: "wrap",
            padding: "20px",
            background: darkMode ? "#1e293b" : "#f8fafc",
            borderRadius: "12px",
            border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0"
        }}>
        <input
          style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              background: darkMode ? "#1e293b" : "#ffffff",
              color: darkMode ? "#f8fafc" : "#0f172a",
              outline: "none",
              width: "100%",
              maxWidth: "300px"
          }}
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              background: darkMode ? "#1e293b" : "#ffffff",
              color: darkMode ? "#f8fafc" : "#0f172a",
              outline: "none",
              width: "100%",
              maxWidth: "300px"
          }}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit" style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#3b82f6",
            color: "white",
            fontWeight: "600",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)"
        }}
        onMouseEnter={(e)=>e.target.style.background="#2563eb"} 
        onMouseLeave={(e)=>e.target.style.background="#3b82f6"}
        >Create Project</button>
      </form>

    {projects.length === 0 && (
        <div style={{
            padding: "40px",
            textAlign: "center",
            background: darkMode ? "#1e293b" : "#ffffff",
            borderRadius: "16px",
            border: darkMode ? "1px dashed #334155" : "1px dashed #cbd5e1",
            marginTop: "20px"
        }}>
            <p style={{fontSize: "18px", color: darkMode ? "#94a3b8" : "#64748b", margin: 0}}>
                No projects yet. Create your first one 🚀
            </p>
        </div>
    )}

<div style={{ 
    marginTop: "20px", 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
    gap: "24px" 
}}>
{projects.map(project => {

  const projectGoals = goals.filter(
    g => g.project_id === project.id
  );

  const totalGoals = projectGoals.length;

  const projectTasks = tasks.filter(task =>
    projectGoals.some(goal => goal.id === task.goal_id)
  );

  const completedTasks = projectTasks.filter(t => t.completed).length;

  const progress =
    projectTasks.length === 0
      ? 0
      : Math.round((completedTasks / projectTasks.length) * 100);

  return (
    <div
      key={project.id}
      onClick={()=>navigate(`/goals?project=${project.id}`)}
      onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-4px)"}
      onMouseLeave={(e)=>e.currentTarget.style.transform="translateY(0)"}
      style={{
        padding: "24px",
        borderRadius: "16px",
        background: darkMode ? "#1e293b" : "#ffffff",
        boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.05)",
        border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.05)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>{project.title}</h3>
      <p style={{ color: darkMode ? "#94a3b8" : "#64748b", flex: 1 }}>{project.description}</p>

      <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "500", color: darkMode ? "#cbd5e1" : "#475569" }}>
        <span>Goals: {totalGoals}</span>
        <span>{progress}%</span>
      </div>

      <div
        style={{
          height: "8px",
          background: darkMode ? "#334155" : "#e2e8f0",
          borderRadius: "8px",
          marginTop: "10px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(to right, #22c55e, #10b981)",
            borderRadius: "8px",
            transition: "width 0.5s ease-out"
          }}
        />
      </div>
    </div>
  );
})}
    </div>
    </div>
  );
}