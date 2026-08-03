import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useOrg } from "../context/OrgContext";
import toast from "react-hot-toast";

export default function GoalDetail({ darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, userRole } = useOrg() || {};

  const [goal, setGoal] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Goal Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWeight, setEditWeight] = useState(1);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Override Form
  const [overrideInput, setOverrideInput] = useState("");
  const [overrideUserEmail, setOverrideUserEmail] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (id && activeOrg) {
      loadGoalData();
    }
  }, [id, activeOrg]);

  async function loadGoalData() {
    setLoading(true);
    try {
      // 1. Fetch Goal details
      const { data: goalData, error: goalErr } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('org_id', activeOrg.id)
        .single();

      if (goalErr || !goalData) {
        toast.error("Goal not found or access denied");
        navigate("/projects");
        return;
      }

      setGoal(goalData);
      setEditTitle(goalData.title);
      setEditDesc(goalData.description || "");
      setEditWeight(goalData.weight || 1);
      setOverrideInput(goalData.progress_override !== null ? String(goalData.progress_override) : "");

      // If progress_override_by is set, fetch user email for audit view
      if (goalData.progress_override_by) {
        const { data: userData } = await supabase
          .from('org_members')
          .select('user_id')
          .eq('user_id', goalData.progress_override_by)
          .single();
        if (userData) {
          setOverrideUserEmail(goalData.progress_override_by);
        }
      }

      // 2. Fetch parent project context
      if (goalData.project_id) {
        const { data: projData } = await supabase
          .from('projects')
          .select('id, title, department_id')
          .eq('id', goalData.project_id)
          .single();
        if (projData) setProject(projData);
      }
    } catch (err) {
      console.error("Error loading goal details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Edit Goal (Title, Description, Weight)
  async function handleEditGoal(e) {
    e.preventDefault();
    if (!canManage) return;

    setSubmittingEdit(true);
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          weight: Number(editWeight) || 1
        })
        .eq('id', goal.id);

      if (error) {
        toast.error(error.message || "Failed to update goal");
      } else {
        toast.success("Goal updated!");
        setShowEditModal(false);
        loadGoalData();
      }
    } catch (err) {
      toast.error("Error updating goal");
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Set Progress Override
  async function handleSetOverride(e) {
    e.preventDefault();
    if (!canManage) {
      toast.error("Permission denied: Only Owners and Managers can override goal progress");
      return;
    }

    const numVal = Number(overrideInput);
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      toast.error("Please enter a valid override percentage (0 - 100)");
      return;
    }

    setSubmittingOverride(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('goals')
        .update({
          progress_override: numVal,
          progress_override_by: user?.id,
          progress_override_at: new Date().toISOString(),
          progress_override_previous: goal.progress_computed || 0
        })
        .eq('id', goal.id);

      if (error) {
        toast.error(error.message || "Failed to set progress override");
      } else {
        toast.success("Progress override saved!");
        loadGoalData();
      }
    } catch (err) {
      toast.error("Error setting override");
    } finally {
      setSubmittingOverride(false);
    }
  }

  // Clear Progress Override
  async function handleClearOverride() {
    if (!canManage) return;

    setSubmittingOverride(true);
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          progress_override: null,
          progress_override_by: null,
          progress_override_at: null,
          progress_override_previous: null
        })
        .eq('id', goal.id);

      if (error) {
        toast.error(error.message || "Failed to clear override");
      } else {
        toast.success("Progress override cleared!");
        setOverrideInput("");
        loadGoalData();
      }
    } catch (err) {
      toast.error("Error clearing override");
    } finally {
      setSubmittingOverride(false);
    }
  }

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>
        Loading goal details...
      </div>
    );
  }

  if (!goal) return null;

  const hasOverride = goal.progress_override !== null && goal.progress_override !== undefined;
  const effectiveProgress = hasOverride ? goal.progress_override : (goal.progress_computed || 0);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", animation: "fadeIn 0.3s ease" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: textMuted }}>
        <Link to="/projects" style={{ color: "#6366f1", textDecoration: "none", fontWeight: "600" }}>Projects</Link>
        <span>/</span>
        {project && (
          <>
            <Link to={`/projects/${project.id}`} style={{ color: "#6366f1", textDecoration: "none", fontWeight: "600" }}>
              {project.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span style={{ color: darkMode ? "#cbd5e1" : "#475569" }}>{goal.title}</span>
      </div>

      {/* Main Goal Card */}
      <div style={{
        background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
        padding: "32px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
              <span style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                background: "rgba(99,102,241,0.15)", color: "#818cf8", textTransform: "uppercase"
              }}>
                🎯 Goal
              </span>

              <span style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                background: darkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                color: darkMode ? "#cbd5e1" : "#475569"
              }}>
                Weight: {goal.weight || 1}
              </span>

              <span style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                background: goal.risk_flag === 'overdue' ? 'rgba(239,68,68,0.2)' : goal.risk_flag === 'at_risk' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)',
                color: goal.risk_flag === 'overdue' ? '#f87171' : goal.risk_flag === 'at_risk' ? '#f59e0b' : '#4ade80'
              }}>
                Risk: {goal.risk_flag || 'none'}
              </span>

              {hasOverride && (
                <span style={{
                  padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                  background: "rgba(245,158,11,0.2)", color: "#f59e0b"
                }}>
                  ⚡ Manual Override Active
                </span>
              )}
            </div>

            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
              {goal.title}
            </h1>

            {goal.description && (
              <p style={{ margin: 0, fontSize: "15px", color: textMuted, lineHeight: "1.6" }}>
                {goal.description}
              </p>
            )}
          </div>

          {canManage && (
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                padding: "9px 16px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#f8fafc" : "#0f172a",
                fontWeight: "600", fontSize: "13px", cursor: "pointer"
              }}
            >
              ✏️ Edit Goal
            </button>
          )}
        </div>

        {/* Progress Display Gauge */}
        <div style={{
          padding: "24px", borderRadius: "14px",
          background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${borderCol}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
              {hasOverride ? "Effective Progress (Overridden)" : "Computed Progress"}
            </span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: hasOverride ? "#f59e0b" : "#6366f1" }}>
              {Math.round(effectiveProgress)}%
            </span>
          </div>

          <div style={{ height: "12px", background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, Math.max(0, effectiveProgress))}%`,
              background: hasOverride ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: "10px", transition: "width 0.3s ease"
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px", color: textMuted }}>
            <span>Read-only Computed: {goal.progress_computed || 0}%</span>
            <span>Status: <strong style={{ textTransform: "capitalize" }}>{goal.status || "active"}</strong></span>
          </div>
        </div>
      </div>

      {/* Manual Progress Override Control Panel (Manager / Owner Only) */}
      <div style={{
        background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
        padding: "28px", marginBottom: "24px"
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚡ Manual Progress Override Mechanism
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: textMuted }}>
          {canManage
            ? "Owners and Managers can explicitly override the computed progress value for executive reporting."
            : "Only Owners and Managers have access to override progress controls."}
        </p>

        {canManage ? (
          <div>
            <form onSubmit={handleSetOverride} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Override Value (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={overrideInput}
                  onChange={(e) => setOverrideInput(e.target.value)}
                  placeholder="e.g. 50"
                  style={{
                    width: "110px", padding: "9px 12px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", fontWeight: "600"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingOverride}
                style={{
                  padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: "#f59e0b", color: "white", fontWeight: "700", fontSize: "13px",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.25)"
                }}
              >
                Set Override
              </button>

              {hasOverride && (
                <button
                  type="button"
                  onClick={handleClearOverride}
                  disabled={submittingOverride}
                  style={{
                    padding: "9px 18px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                    background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#f87171" : "#dc2626",
                    fontWeight: "600", fontSize: "13px", cursor: "pointer"
                  }}
                >
                  Clear Override
                </button>
              )}
            </form>

            {/* Audit Trail Metadata Info */}
            {hasOverride && (
              <div style={{
                padding: "14px 18px", borderRadius: "10px",
                background: darkMode ? "rgba(245,158,11,0.1)" : "#fffbeb",
                border: "1px solid rgba(245,158,11,0.3)", fontSize: "13px", color: darkMode ? "#fbbf24" : "#b45309"
              }}>
                <strong>Audit Record:</strong> Override of <strong>{goal.progress_override}%</strong> set on{" "}
                {new Date(goal.progress_override_at).toLocaleString()}.<br />
                <span>Previous computed progress at override time: <strong>{goal.progress_override_previous ?? 0}%</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: "14px 18px", borderRadius: "10px",
            background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${borderCol}`,
            fontSize: "13px", color: textMuted
          }}>
            🔒 Read-only view for Employee / Guest role. Override controls are restricted to Owners & Managers per §5.2.
          </div>
        )}
      </div>

      {/* Edit Goal Modal */}
      {showEditModal && (
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
                Edit Goal
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleEditGoal}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Goal Title *
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
                  Weight (Numeric, default 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submittingEdit ? 0.6 : 1
                  }}
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
