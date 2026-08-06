import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import GoalCard from '../components/GoalCard';
import { useLocation, useNavigate } from "react-router-dom";
import { useOrg } from "../context/OrgContext";
import toast from "react-hot-toast";

export default function Goals({ user, goals, tasks, projects, setTasks, fetchGoals, fetchTasks, toggleTask, updateTask, updateGoal, darkMode, loading, aiInsights = { focusToday: [] } }) {
  const navigate = useNavigate();
  const { activeOrg, userRole, canManageGoals } = useOrg() || {};
  const canManage = canManageGoals ?? (userRole === 'owner' || userRole === 'manager');

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskInputs, setTaskInputs] = useState({});
  const [deadlineInputs, setDeadlineInputs] = useState({});
  const taskInputRef = useRef(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const projectFromURL = queryParams.get("project");

  useEffect(() => { taskInputRef.current?.focus(); }, []);
  useEffect(() => { if (projectFromURL) setFilterProject(projectFromURL); }, [projectFromURL]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManage) {
      toast.error("Permission denied: Only Owners and Managers can create goals");
      return;
    }
    if (!user || !activeOrg) { alert("You must be logged in and have an active organization"); return; }

    const targetProjId = selectedProject || (projects.length > 0 ? projects[0].id : null);
    if (!targetProjId) {
      toast.error("Please create a Project first before adding goals.");
      return;
    }

    const { error } = await supabase.from("goals").insert([{
      org_id: activeOrg.id,
      project_id: targetProjId,
      title: title.trim(),
      description: description.trim() || null,
      weight: 1,
      created_by: user.id
    }]);

    if (!error) {
      setTitle(""); setDescription(""); fetchGoals(); setSelectedProject("");
      toast.success("Goal added successfully");
    } else {
      console.error("Insert Goal Error:", error);
      toast.error(error.message || "Failed to add goal");
    }
  }

  async function addTask(goalId) {
    const title = taskInputs[goalId];
    const deadline = deadlineInputs[goalId];
    if (!title || !activeOrg) return;

    const { error } = await supabase.from("tasks").insert([{
      org_id: activeOrg.id,
      goal_id: goalId,
      title: title.trim(),
      assignee_id: user.id,
      assigner_id: user.id,
      weight: 1,
      completed: false,
      deadline: deadline || null
    }]);

    if (!error) {
      setTaskInputs({ ...taskInputs, [goalId]: "" });
      setDeadlineInputs({ ...deadlineInputs, [goalId]: "" });
      fetchTasks();
      toast.success("Task added successfully");
    } else {
      console.error("Insert Task Error:", error);
      toast.error(error.message || "Failed to add task");
    }
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success("Task deleted");
    } else {
      toast.error("Failed to delete task");
    }
  }

  async function deleteGoal(goalId) {
    const { error: taskError } = await supabase.from("tasks").delete().eq("goal_id", goalId);
    if (taskError) console.error("Error deleting tasks:", taskError);

    const { error: goalError } = await supabase.from("goals").delete().eq("id", goalId);
    if (!goalError) {
      fetchGoals(); fetchTasks();
      toast.success("Goal deleted");
    } else {
      toast.error("Failed to delete goal");
    }
  }

  const inputStyle = {
    padding: "11px 14px", borderRadius: "10px",
    border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
    background: darkMode ? "rgba(15,23,42,0.8)" : "#ffffff",
    color: darkMode ? "#f8fafc" : "#0f172a",
    outline: "none", fontSize: "14px", flex: "1 1 200px", minWidth: 0,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    fontFamily: "inherit",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer", appearance: "none", flex: "0 1 200px",
  };

  const filteredGoals = goals.filter(goal =>
    filterProject ? goal.project_id === filterProject : true
  );

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.35s ease" }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", letterSpacing: "-0.6px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>
            Goals
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: darkMode ? "#64748b" : "#94a3b8" }}>
            {goals.length} goal{goals.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {projects.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", whiteSpace: "nowrap" }}>
              Project
            </label>
            <select
              className="form-select"
              style={selectStyle}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            >
              <option value="">None</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Project Prerequisite Warning Banner */}
      {projects.length === 0 && (
        <div style={{
          marginBottom: "24px", padding: "16px 20px", borderRadius: "14px",
          background: darkMode ? "rgba(245,158,11,0.12)" : "#fffbeb",
          border: "1px solid rgba(245,158,11,0.35)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>📁</span>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: "700", color: darkMode ? "#fbbf24" : "#b45309" }}>
                You need a Project first
              </div>
              <div style={{ fontSize: "13px", color: darkMode ? "#cbd5e1" : "#475569" }}>
                Goals must be linked to a Project. Create at least one project before adding goals.
              </div>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => navigate('/projects')}
              style={{
                padding: "9px 18px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#ffffff",
                fontWeight: "700", fontSize: "13px", cursor: "pointer",
                boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
              }}
            >
              + Create Project Now
            </button>
          )}
        </div>
      )}

      {/* Add goal form (Owner/Manager only) */}
      {canManage && (
        <div style={{
          marginBottom: "28px", padding: "20px 24px",
          background: darkMode ? "#1e293b" : "#f8fafc",
          borderRadius: "14px",
          border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e2e8f0",
        }}>
          <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: darkMode ? "#64748b" : "#94a3b8" }}>
            New Goal
          </p>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={inputStyle} ref={taskInputRef} placeholder="Goal title"
              value={title} onChange={(e) => setTitle(e.target.value)}
              required
              onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            />
            <input
              style={inputStyle} placeholder="Description (optional)"
              value={description} onChange={(e) => setDescription(e.target.value)}
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
              + Add Goal
            </button>
          </form>
        </div>
      )}

      {/* Filter bar */}
      {projects.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", whiteSpace: "nowrap" }}>
            Filter by
          </label>
          <select
            className="form-select"
            style={{ ...selectStyle, flex: "0 1 240px" }}
            value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          >
            <option value="">All Projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{
          padding: "64px 48px", textAlign: "center",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📈</div>
          <p style={{ fontSize: "16px", fontWeight: "600", color: darkMode ? "#94a3b8" : "#64748b", margin: "0 0 6px" }}>No goals yet</p>
          <p style={{ fontSize: "13px", color: darkMode ? "#475569" : "#94a3b8", margin: 0 }}>Add your first goal above to start tracking progress</p>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filteredGoals.map((goal, idx) => (
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
            deadlineInputs={deadlineInputs}
            setDeadlineInputs={setDeadlineInputs}
            updateTask={updateTask}
            updateGoal={updateGoal}
            darkMode={darkMode}
            aiInsights={aiInsights}
            accentIndex={idx}
          />
        ))}
      </ul>
    </div>
  );
}