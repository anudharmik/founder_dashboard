import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Projects({ user,projects,fetchProjects,darkMode,loading,goals,tasks}) {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
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
    
    <div style={{ padding: "20px" }}>
      <h1>Projects</h1>

      <form onSubmit={createProject}>
        <input
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit">Create Project</button>
      </form>

    {projects.length === 0 && (
      <p style={{ color: "#6b7280" }}>
      No projects yet. Create your first one 🚀
      </p>
    )}

      <div style={{ marginTop: "20px" }}>
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
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: darkMode ? "#1e293b" : "#ffffff",
        marginBottom: "15px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
      }}
    >
      <h3>{project.title}</h3>
      <p>{project.description}</p>

      <p style={{ marginTop: "10px" }}>
        Goals: {totalGoals}
      </p>

      <p>
        Progress: {progress}%
      </p>

      <div
        style={{
          height: "8px",
          background: "#e5e7eb",
          borderRadius: "6px",
          marginTop: "8px"
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#22c55e",
            borderRadius: "6px"
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