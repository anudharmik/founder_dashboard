import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useOrg } from "../context/OrgContext";
import toast from "react-hot-toast";

export default function ProjectDetail({ darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, userRole } = useOrg() || {};

  const [project, setProject] = useState(null);
  const [goals, setGoals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEditProjModal, setShowEditProjModal] = useState(false);

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [goalWeight, setGoalWeight] = useState(1);
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Edit Project Form State
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editTeamIds, setEditTeamIds] = useState([]);
  const [submittingProj, setSubmittingProj] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (id && activeOrg) {
      loadProjectData();
    }
  }, [id, activeOrg]);

  async function loadProjectData() {
    setLoading(true);
    try {
      // 1. Fetch project details
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select(`
          *,
          departments ( id, name ),
          project_teams ( team_id, teams ( id, name ) )
        `)
        .eq('id', id)
        .eq('org_id', activeOrg.id)
        .single();

      if (projErr || !projData) {
        toast.error("Project not found or accessible");
        navigate("/projects");
        return;
      }

      setProject(projData);
      setEditTitle(projData.title);
      setEditDesc(projData.description || "");
      setEditDeptId(projData.department_id);
      setEditTeamIds(projData.project_teams?.map(pt => pt.team_id) || []);

      // 2. Fetch goals for this project
      const { data: goalsData, error: goalsErr } = await supabase
        .from('goals')
        .select('*')
        .eq('project_id', id)
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (!goalsErr) setGoals(goalsData || []);

      // 3. Fetch departments & teams for edit modal
      if (canManage) {
        const { data: dData } = await supabase.from('departments').select('*').eq('org_id', activeOrg.id);
        if (dData) setDepartments(dData);

        const { data: tData } = await supabase.from('teams').select('*').eq('org_id', activeOrg.id);
        if (tData) setTeams(tData);
      }
    } catch (err) {
      console.error("Error loading project details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Create Goal
  async function handleCreateGoal(e) {
    e.preventDefault();
    if (!canManage) {
      toast.error("Permission denied: Only Owners and Managers can create goals");
      return;
    }

    setSubmittingGoal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newGoal, error: goalErr } = await supabase
        .from('goals')
        .insert({
          org_id: activeOrg.id,
          project_id: project.id,
          title: goalTitle.trim(),
          description: goalDesc.trim() || null,
          weight: Number(goalWeight) || 1,
          status: 'active',
          risk_flag: 'none',
          created_by: user?.id
        })
        .select()
        .single();

      if (goalErr) {
        toast.error(goalErr.message || "Failed to create goal");
      } else {
        toast.success("Goal created successfully!");
        setGoalTitle("");
        setGoalDesc("");
        setGoalWeight(1);
        setShowGoalModal(false);
        loadProjectData();
      }
    } catch (err) {
      toast.error("Error creating goal");
    } finally {
      setSubmittingGoal(false);
    }
  }

  // Edit Project
  async function handleEditProject(e) {
    e.preventDefault();
    if (!canManage) return;

    setSubmittingProj(true);
    try {
      const { error: updateErr } = await supabase
        .from('projects')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          department_id: editDeptId
        })
        .eq('id', project.id);

      if (updateErr) {
        toast.error(updateErr.message);
        setSubmittingProj(false);
        return;
      }

      // Update project_teams
      await supabase.from('project_teams').delete().eq('project_id', project.id);
      if (editTeamIds.length > 0) {
        const teamRows = editTeamIds.map(tId => ({ project_id: project.id, team_id: tId }));
        await supabase.from('project_teams').insert(teamRows);
      }

      toast.success("Project updated!");
      setShowEditProjModal(false);
      loadProjectData();
    } catch (err) {
      toast.error("Error updating project");
    } finally {
      setSubmittingProj(false);
    }
  }

  // Delete Project
  async function handleDeleteProject() {
    if (!canManage) return;
    if (!window.confirm("Are you sure you want to delete this project and all its goals?")) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) {
        toast.error("Failed to delete project");
      } else {
        toast.success("Project deleted");
        navigate("/projects");
      }
    } catch (err) {
      toast.error("Error deleting project");
    }
  }

  function toggleTeamSelection(tId) {
    setEditTeamIds(prev =>
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    );
  }

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>
        Loading project details...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: textMuted }}>
        <Link to="/projects" style={{ color: "#6366f1", textDecoration: "none", fontWeight: "600" }}>Projects</Link>
        <span>/</span>
        <span style={{ color: darkMode ? "#cbd5e1" : "#475569" }}>{project.title}</span>
      </div>

      {/* Project Header Header Card */}
      <div style={{
        background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
        padding: "32px", marginBottom: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            {/* Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              <span style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700",
                background: "rgba(99,102,241,0.15)", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.04em"
              }}>
                🏢 {project.departments?.name}
              </span>

              {project.project_teams?.map(pt => (
                <span key={pt.team_id} style={{
                  padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
                  background: darkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                  color: darkMode ? "#cbd5e1" : "#475569"
                }}>
                  👥 {pt.teams?.name}
                </span>
              ))}
            </div>

            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(24px, 5vw, 32px)", fontWeight: "800", letterSpacing: "-0.7px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
              {project.title}
            </h1>

            {project.description && (
              <p style={{ margin: 0, fontSize: "15px", color: textMuted, maxWidth: "700px", lineHeight: "1.6" }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Manager / Owner Action Buttons */}
          {canManage && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowEditProjModal(true)}
                style={{
                  padding: "9px 16px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                  background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#f8fafc" : "#0f172a",
                  fontWeight: "600", fontSize: "13px", cursor: "pointer"
                }}
              >
                ✏️ Edit Project
              </button>
              <button
                onClick={handleDeleteProject}
                style={{
                  padding: "9px 16px", borderRadius: "10px", border: "none",
                  background: "rgba(239,68,68,0.15)", color: "#f87171",
                  fontWeight: "600", fontSize: "13px", cursor: "pointer"
                }}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            Project Goals
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
            {goals.length} Goal{goals.length !== 1 ? "s" : ""} under this project
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowGoalModal(true)}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "14px", boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
            }}
          >
            + Add Goal
          </button>
        )}
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", background: cardBg, borderRadius: "16px",
          border: `1px dashed ${borderCol}`
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎯</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            No goals added yet
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: textMuted }}>
            Create goals to track measurable progress for this project.
          </p>
          {canManage && (
            <button
              onClick={() => setShowGoalModal(true)}
              style={{
                padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "#6366f1", color: "white", fontWeight: "600", fontSize: "13px"
              }}
            >
              + Add First Goal
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {goals.map(goal => {
            const hasOverride = goal.progress_override !== null && goal.progress_override !== undefined;
            const effectiveProgress = hasOverride ? goal.progress_override : (goal.progress_computed || 0);

            return (
              <div
                key={goal.id}
                onClick={() => navigate(`/goals/${goal.id}`)}
                style={{
                  background: cardBg, borderRadius: "14px", border: `1px solid ${borderCol}`,
                  padding: "20px 24px", cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderCol;
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                      {goal.title}
                    </h3>

                    {/* Weight Badge */}
                    <span style={{
                      padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
                      background: darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                      color: darkMode ? "#cbd5e1" : "#475569"
                    }}>
                      Weight: {goal.weight || 1}
                    </span>

                    {/* Override Badge */}
                    {hasOverride && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(245,158,11,0.2)", color: "#f59e0b"
                      }}>
                        ⚡ Overridden
                      </span>
                    )}
                  </div>

                  {goal.description && (
                    <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
                      {goal.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar & Value */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "200px" }}>
                  <div style={{ flex: 1, height: "8px", background: darkMode ? "#0f172a" : "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${Math.min(100, Math.max(0, effectiveProgress))}%`,
                      background: hasOverride ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      borderRadius: "10px", transition: "width 0.3s ease"
                    }} />
                  </div>

                  <span style={{ fontSize: "14px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a", width: "45px", textAlign: "right" }}>
                    {Math.round(effectiveProgress)}%
                  </span>

                  <span style={{ color: "#6366f1", fontWeight: "700", fontSize: "16px" }}>&rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Creation Modal */}
      {showGoalModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "500px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                Add New Goal
              </h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateGoal}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Goal Title *
                </label>
                <input
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Increase Monthly Recurring Revenue by 25%"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Weight (Relative importance, default 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  placeholder="Goal scope and success criteria..."
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGoal}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submittingGoal ? 0.6 : 1
                  }}
                >
                  {submittingGoal ? "Adding..." : "Add Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "520px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                Edit Project
              </h2>
              <button onClick={() => setShowEditProjModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleEditProject}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Project Title *
                </label>
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Department *
                </label>
                <select
                  required
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Associated Teams
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {teams.map(t => {
                    const isSelected = editTeamIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTeamSelection(t.id)}
                        style={{
                          padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "500",
                          border: `1px solid ${isSelected ? "#6366f1" : borderCol}`,
                          background: isSelected ? "rgba(99,102,241,0.2)" : (darkMode ? "#0f172a" : "#f8fafc"),
                          color: isSelected ? "#818cf8" : (darkMode ? "#cbd5e1" : "#475569"),
                          cursor: "pointer"
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}{t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditProjModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProj}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submittingProj ? 0.6 : 1
                  }}
                >
                  {submittingProj ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
