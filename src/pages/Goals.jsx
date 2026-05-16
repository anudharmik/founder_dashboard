import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import GoalCard from '../components/GoalCard';
import { useRef } from 'react';
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function Goals({ user, goals, tasks, projects, setTasks, fetchGoals, fetchTasks, toggleTask, updateTask, updateGoal, darkMode, loading, aiInsights }) {

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
    if (!user) { alert("you must be logged in"); return; }

    const { error } = await supabase.from("goals").insert([{
      title, description, progress: 0, status: "active",
      user_id: user.id, project_id: selectedProject || null
    }]);

    if (!error) {
      setTitle(""); setDescription(""); fetchGoals(); setSelectedProject("");
      toast.success("Goal added successfully");
    } else {
      toast.error("Failed to add goal");
    }
  }

  async function addTask(goalId) {
    const title = taskInputs[goalId];
    const deadline = deadlineInputs[goalId];
    if (!title) return;

    const { error } = await supabase.from("tasks").insert([{
      title, goal_id: goalId, completed: false, user_id: user.id, deadline: deadline || null
    }]);

    if (!error) {
      setTaskInputs({ ...taskInputs, [goalId]: "" });
      setDeadlineInputs({ ...deadlineInputs, [goalId]: "" });
      fetchTasks();
      toast.success("Task added successfully");
    } else {
      toast.error("Failed to add task");
    }
  }

  async function deleteTask(taskId) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success("Task deleted successfully");
    } else {
      toast.error("Failed to delete task");
    }
  }

  async function deleteGoal(goalId) {
    console.log("Deleting goal with ID:", goalId);
    const { error: taskError } = await supabase.from("tasks").delete().eq("goal_id", goalId);
    if (taskError) console.error("Error deleting tasks for goal:", taskError);

    const { error: goalError } = await supabase.from("goals").delete().eq("id", goalId);
    if (goalError) console.error("Error deleting goal:", goalError);

    if (!goalError) {
      fetchGoals(); fetchTasks();
      toast.success("Goal deleted successfully");
    } else {
      toast.error("Failed to delete goal");
    }
  }

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

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none",
    flex: "0 1 200px",
  };

  const btnPrimary = {
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
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%" }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "700", letterSpacing: "-0.5px", color: darkMode ? "#f1f5f9" : "#0f172a" }}>Goals</h1>
          <p style={{ margin: 0, fontSize: "14px", color: darkMode ? "#64748b" : "#94a3b8" }}>
            {goals.length} goal{goals.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: darkMode ? "#94a3b8" : "#64748b" }}>Add to project</label>
          <select style={selectStyle} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">None</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </div>
      </div>

      {/* Add goal form */}
      <form
        onSubmit={handleSubmit}
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
        <input style={inputStyle} ref={taskInputRef} placeholder="Goal title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input style={inputStyle} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          style={btnPrimary}
          type="submit"
          onMouseEnter={(e) => e.currentTarget.style.background = "#4f46e5"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#6366f1"}
        >
          + Add Goal
        </button>
      </form>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", fontWeight: "500", color: darkMode ? "#94a3b8" : "#64748b" }}>Filter</label>
        <select style={selectStyle} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{
          padding: "48px",
          textAlign: "center",
          background: darkMode ? "#1e293b" : "#ffffff",
          borderRadius: "16px",
          border: darkMode ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #e2e8f0",
        }}>
          <p style={{ fontSize: "16px", color: darkMode ? "#64748b" : "#94a3b8", margin: 0 }}>
            No goals yet — add your first one above 📈
          </p>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {goals
          .filter(goal => filterProject ? goal.project_id === filterProject : true)
          .map(goal => (
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
            />
          ))}
      </ul>
    </div>
  );
}