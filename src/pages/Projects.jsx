import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { useOrg } from "../context/OrgContext";
import { calculateProjectProgress } from "../utils/rollupEngine";
import toast from "react-hot-toast";

export default function Projects({ darkMode }) {
  const navigate = useNavigate();
  const { activeOrg, userRole } = useOrg() || {};

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptFilter, setDeptFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  // Create Project Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const canManageProjects = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (activeOrg) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [activeOrg]);

  async function loadData() {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      // Fetch departments
      const { data: deptData, error: deptErr } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', activeOrg.id)
        .order('name');
      if (!deptErr && deptData) setDepartments(deptData);

      // Fetch teams
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('org_id', activeOrg.id)
        .order('name');
      if (!teamErr && teamData) setTeams(teamData);

      // Fetch projects with departments, project_teams (and teams), and goals count
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select(`
          *,
          departments ( id, name ),
          project_teams ( team_id, teams ( id, name ) ),
          goals ( id, title, progress_computed, progress_override, weight )
        `)
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (projErr) {
        toast.error("Failed to load projects");
      } else {
        setProjects(projData || []);
      }
    } catch (err) {
      console.error("Error loading projects data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!canManageProjects) {
      toast.error("Permission denied: Only Owners and Managers can create projects");
      return;
    }
    if (!departmentId) {
      toast.error("Department is required for project creation");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert Project
      const { data: newProj, error: projErr } = await supabase
        .from('projects')
        .insert({
          org_id: activeOrg.id,
          department_id: departmentId,
          title: title.trim(),
          description: description.trim() || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (projErr) {
        toast.error(projErr.message || "Failed to create project");
        setSubmitting(false);
        return;
      }

      // 2. Insert project_teams if teams selected
      if (selectedTeamIds.length > 0 && newProj) {
        const teamRows = selectedTeamIds.map(tId => ({
          project_id: newProj.id,
          team_id: tId
        }));
        const { error: teamLinkErr } = await supabase.from('project_teams').insert(teamRows);
        if (teamLinkErr) {
          console.warn("Failed linking teams:", teamLinkErr);
        }
      }

      toast.success("Project created successfully!");
      setTitle("");
      setDescription("");
      setDepartmentId("");
      setSelectedTeamIds([]);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      toast.error("Error creating project");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTeamSelection(tId) {
    setSelectedTeamIds(prev =>
      prev.includes(tId) ? prev.filter(id => id !== tId) : [...prev, tId]
    );
  }

  // Filter projects
  const filteredProjects = projects.filter(p => {
    if (deptFilter && p.department_id !== deptFilter) return false;
    if (teamFilter) {
      const hasTeam = p.project_teams?.some(pt => pt.team_id === teamFilter);
      if (!hasTeam) return false;
    }
    return true;
  });

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", letterSpacing: "-0.6px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            Projects
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: textMuted }}>
            Manage strategic initiatives and track goal progress across departments
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "11px 22px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "14px", transition: "all 0.18s ease",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)", display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            <span style={{ fontSize: "18px", leading: "1" }}>+</span> New Project
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center",
        padding: "16px 20px", background: cardBg, borderRadius: "14px", border: `1px solid ${borderCol}`
      }}>
        <span style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: textMuted }}>
          Filter By:
        </span>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="form-select"
          style={{
            padding: "9px 36px 9px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
            background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#f8fafc" : "#0f172a",
            fontSize: "13px", fontWeight: "500", cursor: "pointer", outline: "none"
          }}
        >
          <option value="">All Departments ({departments.length})</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Team Filter */}
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="form-select"
          style={{
            padding: "9px 36px 9px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
            background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#f8fafc" : "#0f172a",
            fontSize: "13px", fontWeight: "500", cursor: "pointer", outline: "none"
          }}
        >
          <option value="">All Teams ({teams.length})</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {(deptFilter || teamFilter) && (
          <button
            onClick={() => { setDeptFilter(""); setTeamFilter(""); }}
            style={{
              padding: "9px 14px", borderRadius: "8px", border: "none",
              background: darkMode ? "rgba(239,68,68,0.15)" : "#fee2e2",
              color: darkMode ? "#f87171" : "#dc2626", fontSize: "13px", fontWeight: "600", cursor: "pointer"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ padding: "24px", borderRadius: "16px", background: cardBg, border: `1px solid ${borderCol}` }}>
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 20, width: "65%", marginBottom: 12, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 14, width: "85%", marginBottom: 20, borderRadius: 6 }} />
              <div className={darkMode ? "skeleton-dark" : "skeleton"} style={{ height: 8, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", background: cardBg, borderRadius: "16px",
          border: `1px dashed ${borderCol}`
        }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>📁</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            No projects found
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: textMuted }}>
            {deptFilter || teamFilter ? "Try clearing your filters to view all projects." : "Create your first project to start organizing goals."}
          </p>
          {canManageProjects && !deptFilter && !teamFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "#6366f1", color: "white", fontWeight: "600", fontSize: "14px"
              }}
            >
              + Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {filteredProjects.map(project => {
            const goalCount = project.goals?.length || 0;
            const deptName = project.departments?.name || "Unassigned Dept";
            const teamLinks = project.project_teams || [];

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  background: cardBg, borderRadius: "16px", border: `1px solid ${borderCol}`,
                  padding: "24px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  boxShadow: darkMode
                    ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px -4px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.8)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = darkMode
                    ? "0 8px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.4)"
                    : "0 12px 32px -4px rgba(99,102,241,0.18), 0 2px 6px rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = borderCol;
                  e.currentTarget.style.boxShadow = darkMode
                    ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px -4px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.8)";
                }}
              >
                <div>
                  {/* Department Badge & Team Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                      background: "rgba(99,102,241,0.12)", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.04em"
                    }}>
                      🏢 {deptName}
                    </span>

                    {teamLinks.map(pt => (
                      <span key={pt.team_id} style={{
                        padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                        background: darkMode ? "rgba(255,255,255,0.07)" : "#f1f5f9",
                        color: darkMode ? "#cbd5e1" : "#475569"
                      }}>
                        👥 {pt.teams?.name}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                    {project.title}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p style={{
                      margin: "0 0 16px", fontSize: "13px", color: textMuted,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                    }}>
                      {project.description}
                    </p>
                  )}

                  {/* Weighted Progress Bar */}
                  {(() => {
                    const projProgress = calculateProjectProgress(project.goals || []);
                    return (
                      <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: darkMode ? "#cbd5e1" : "#475569" }}>
                          <span>Weighted Progress</span>
                          <span style={{ color: "#6366f1", fontWeight: "700" }}>{projProgress}%</span>
                        </div>
                        <div style={{ height: "6px", background: darkMode ? "#0f172a" : "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${Math.min(100, Math.max(0, projProgress))}%`,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: "10px", transition: "width 0.3s ease"
                          }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Footer Metadata */}
                <div style={{
                  paddingTop: "16px", marginTop: "16px", borderTop: `1px solid ${borderCol}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px"
                }}>
                  <span style={{ color: textMuted, fontWeight: "500" }}>
                    🎯 {goalCount} Goal{goalCount !== 1 ? "s" : ""}
                  </span>

                  <span style={{ color: "#6366f1", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                    View Project &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          overflowY: "auto"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            animation: "scaleUp 0.2s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                Create New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              {/* Title */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Project Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Mobile App Launch"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Department (Required) */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Department *
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="form-select"
                  style={{
                    width: "100%", padding: "11px 38px 11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box", cursor: "pointer"
                  }}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key objectives and project overview..."
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              {/* Teams (Optional Association) */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Associate Teams (Optional)
                </label>
                {teams.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>No teams created in org yet.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {teams.map(t => {
                      const isSelected = selectedTeamIds.includes(t.id);
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
                            cursor: "pointer", transition: "all 0.15s ease"
                          }}
                        >
                          {isSelected ? "✓ " : "+ "}{t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}