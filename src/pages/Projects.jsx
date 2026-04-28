import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Projects({ user,projects,fetchProjects,darkMode,loading}) {

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
      {projects.map(project => (
      <div
       key={project.id}
       style={{
        padding: "15px",
        borderRadius: "10px",
        background: "#fff",
        marginBottom: "10px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
       }}
      >
       <h3>{project.title}</h3>
       <p>{project.description}</p>
      </div>
      ))}
    </div>
    </div>
  );
}