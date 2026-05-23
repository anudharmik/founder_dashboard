import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ACCENTS = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6"];

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
    padding: "11px 14px",
    borderRadius: "10px",
    border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
    background: darkMode ? "rgba(15,23,42,0.8)" : "#ffffff",
    color: darkMode ? "#f8fafc" : "#0f172a",
    outline: "none",
    fontSize: "14px",
    flex: "1 1 200px",
    minWidth: 0,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.35s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", letterSpacing: "-0.6px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
          Projects
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#64748b" : "#94a3b8" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Create form */}
      <div style={{
        marginBottom: "28px", padding: "20px 24px",
        background: darkMode ? "#1e293b" : "#f8fafc",
        borderRadius: "14px",
        border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
      }}>
        <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: darkMode ? "#64748b" : "#94a3b8" }}>
          New Project
        </p>
        <form onSubmit={createProject} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={inputStyle}
            placeholder="Project name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
          <input
            style={inputStyle}
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
          <button
            type="submit"
            style={{
              padding: "11px 22px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "14px", transition: "all 0.18s ease",
              boxShadow: "0 4px 12px rgba(99,102,241,0.35)", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(99,102,241,0.45)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.35)"; }}
          >
            + Create Project
          </button>
        </form>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div style={{
          padding: "64px 48px", textAlign: "center",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚀</div>
          <p style={{ fontSize: "16px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 6px" }}>
            No projects yet
          </p>
          <p style={{ fontSize: "13px", color: darkMode ? "#475569" : "#94a3b8", margin: 0 }}>
            Create your first project to start organizing goals
          </p>
        </div>
      )}

      {/* Project cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
        {projects.map((project, idx) => {
          const accent = ACCENTS[idx % ACCENTS.length];
          const projectGoals = goals.filter(g => g.project_id === project.id);
          const projectTasks = tasks.filter(task => projectGoals.some(goal => goal.id === task.goal_id));
          const completedCount = projectTasks.filter(t => t.completed).length;
          const progress = projectTasks.length === 0 ? 0 : Math.round((completedCount / projectTasks.length) * 100);

          // Initials from project title
          const initials = project.title
            .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

          return (
            <div
              key={project.id}
              className="stagger-item"
              onClick={() => navigate(`/goals?project=${project.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = darkMode ? "0 12px 36px rgba(0,0,0,0.5)" : "0 12px 36px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = darkMode ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)";
              }}
              style={{
                padding: "0", borderRadius: "16px",
                background: darkMode ? "#1e293b" : "#ffffff",
                boxShadow: darkMode ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.06)",
                border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}
            >
              {/* Accent stripe */}
              <div style={{ height: "4px", background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

              <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header row: initials + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                    background: `${accent}20`, border: `1px solid ${accent}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: "800", color: accent, letterSpacing: "-0.3px",
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "15px", fontWeight: "700", margin: "0 0 3px", color: darkMode ? "#f1f5f9" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {project.title}
                    </h3>
                    <p style={{ color: darkMode ? "#64748b" : "#94a3b8", fontSize: "12.5px", lineHeight: "1.4", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {project.description || "No description"}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "10px", marginTop: "auto" }}>
                  <span style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
                    {projectGoals.length} goal{projectGoals.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ color: accent }}>{progress}% done</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: "6px", background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{
                    width: `${progress}%`, height: "100%",
                    background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                    borderRadius: "6px", transition: "width 0.6s ease-out",
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