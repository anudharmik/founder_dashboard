import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Projects({ user, projects, fetchProjects, darkMode, loading, goals, tasks }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  async function createProject(e) {
    e.preventDefault();
    const { error } = await supabase.from("projects").insert([{ title, description, user_id: user.id }]);
    if (!error) {
      setTitle(""); setDescription(""); fetchProjects();
      toast.success("Project created!");
    } else {
      toast.error("Failed to create project");
    }
  }

  if (!projects || !goals || !tasks) return null;

  const inputStyle = {
    padding: "9px 14px",
    borderRadius: "8px",
    border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
    background: darkMode ? "#0f172a" : "#ffffff",
    color: darkMode ? "#f8fafc" : "#0f172a",
    outline: "none",
    fontSize: "14px",
    flex: "1 1 200px",
    minWidth: 0,
  };

  // Cycle through subtle accent colors for project cards
  const ACCENTS = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6"];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "700", letterSpacing: "-0.5px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
          Projects
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: darkMode ? "#64748b" : "#94a3b8" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Create form */}
      <form
        onSubmit={createProject}
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          flexWrap: "wrap",
          padding: "18px 20px",
          background: darkMode ? "#1e293b" : "#f8fafc",
          borderRadius: "12px",
          border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
          alignItems: "center",
        }}
      >
        <input style={inputStyle} placeholder="Project name" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input style={inputStyle} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          type="submit"
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#6366f1",
            color: "white",
            fontWeight: "600",
            fontSize: "14px",
            transition: "background 0.15s ease",
            boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#4f46e5"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#6366f1"}
        >
          + Create Project
        </button>
      </form>

      {/* Empty state */}
      {projects.length === 0 && (
        <div style={{
          padding: "48px",
          textAlign: "center",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #e2e8f0",
        }}>
          <p style={{ fontSize: "16px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
            No projects yet — create your first one 🚀
          </p>
        </div>
      )}

      {/* Project cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "20px",
      }}>
        {projects.map((project, idx) => {
          const accent = ACCENTS[idx % ACCENTS.length];
          const projectGoals = goals.filter(g => g.project_id === project.id);
          const projectTasks = tasks.filter(task => projectGoals.some(goal => goal.id === task.goal_id));
          const completedTasks = projectTasks.filter(t => t.completed).length;
          const progress = projectTasks.length === 0 ? 0 : Math.round((completedTasks / projectTasks.length) * 100);

          return (
            <div
              key={project.id}
              onClick={() => navigate(`/goals?project=${project.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = darkMode
                  ? "0 8px 28px rgba(0,0,0,0.45)"
                  : "0 8px 28px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = darkMode
                  ? "0 2px 12px rgba(0,0,0,0.35)"
                  : "0 2px 12px rgba(0,0,0,0.06)";
              }}
              style={{
                padding: "0",
                borderRadius: "14px",
                background: darkMode ? "#1e293b" : "#ffffff",
                boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)",
                border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Accent top stripe */}
              <div style={{ height: "4px", background: accent, flexShrink: 0 }} />

              <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                  {project.title}
                </h3>
                <p style={{ color: darkMode ? "#64748b" : "#94a3b8", flex: 1, fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px" }}>
                  {project.description || "No description"}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", marginBottom: "8px" }}>
                  <span>{projectGoals.length} goal{projectGoals.length !== 1 ? "s" : ""}</span>
                  <span style={{ color: accent }}>{progress}%</span>
                </div>

                <div style={{ height: "6px", background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: accent,
                    borderRadius: "6px",
                    transition: "width 0.5s ease-out",
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}