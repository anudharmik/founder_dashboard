import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useOrg } from "../context/OrgContext";
import { recomputeGoalProgressAndRisk } from "../utils/rollupEngine";
import TaskDetailModal from "../components/TaskDetailModal";
import toast from "react-hot-toast";

async function logActivity(orgId, entityType, entityId, action, metadata = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: user?.id || null,
      action: action,
      metadata: metadata
    });
  } catch (err) {
    console.warn("Failed to write activity_log:", err);
  }
}

export default function GoalDetail({ darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg, userRole, orgMembers } = useOrg() || {};

  const [goal, setGoal] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Goal Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWeight, setEditWeight] = useState(1);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Override Form
  const [overrideInput, setOverrideInput] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  // Task Creation Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskWeight, setTaskWeight] = useState(1);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskBlockedBy, setTaskBlockedBy] = useState("");
  const [taskRequiresApproval, setTaskRequiresApproval] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);

  const canManageGoal = userRole === 'owner' || userRole === 'manager';
  const isEmployee = userRole === 'employee';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        if (isEmployee) setTaskAssigneeId(data.user.id);
      }
    });
  }, [userRole]);

  useEffect(() => {
    if (id && activeOrg) {
      loadData();
    }
  }, [id, activeOrg]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      // 2. Fetch parent project
      if (goalData.project_id) {
        const { data: projData } = await supabase
          .from('projects')
          .select('id, title, department_id')
          .eq('id', goalData.project_id)
          .single();
        if (projData) setProject(projData);
      }

      // 3. Fetch tasks for this goal
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', id)
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (!tasksErr) setTasks(tasksData || []);

      // 4. Fetch org members for assignee dropdown
      const { data: mems } = await supabase
        .from('org_members')
        .select('id, user_id, role')
        .eq('org_id', activeOrg.id);
      if (mems) setMembersList(mems);

    } catch (err) {
      console.error("Error loading goal details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Check if employee has existing assignment under this goal (for self-scoped creation rule)
  const employeeHasExistingAssignment = tasks.some(t => t.assignee_id === currentUserId);
  const canCreateTask = canManageGoal || (isEmployee && employeeHasExistingAssignment);

  // Handle Edit Goal
  async function handleEditGoal(e) {
    e.preventDefault();
    if (!canManageGoal) return;

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
        loadData();
      }
    } catch (err) {
      toast.error("Error updating goal");
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Set Override
  async function handleSetOverride(e) {
    e.preventDefault();
    if (!canManageGoal) return;

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
        await logActivity(activeOrg.id, 'goal', goal.id, 'overridden', { progress_override: numVal });
        toast.success("Progress override saved!");
        loadData();
      }
    } catch (err) {
      toast.error("Error setting override");
    } finally {
      setSubmittingOverride(false);
    }
  }

  // Clear Override
  async function handleClearOverride() {
    if (!canManageGoal) return;

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
        await logActivity(activeOrg.id, 'goal', goal.id, 'overridden', { action_type: 'cleared', previous_override: goal.progress_override });
        toast.success("Progress override cleared!");
        setOverrideInput("");
        loadData();
      }
    } catch (err) {
      toast.error("Error clearing override");
    } finally {
      setSubmittingOverride(false);
    }
  }

  // Create Task
  async function handleCreateTask(e) {
    e.preventDefault();
    if (!canCreateTask) {
      toast.error("Permission denied: Employees can only create tasks on goals where they are already assigned work");
      return;
    }

    const assignedUserId = isEmployee ? currentUserId : (taskAssigneeId || currentUserId);
    if (!assignedUserId) {
      toast.error("Please select a task assignee");
      return;
    }

    setSubmittingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const approvalStatus = taskRequiresApproval ? 'pending' : 'not_required';

      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          org_id: activeOrg.id,
          goal_id: goal.id,
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          weight: Number(taskWeight) || 1,
          deadline: taskDeadline || null,
          assignee_id: assignedUserId,
          assigner_id: user?.id,
          reviewer_id: user?.id, // defaults to assigner
          approval_status: approvalStatus,
          blocked_by: taskBlockedBy || null,
          completed: false
        })
        .select()
        .single();

      if (taskErr) {
        toast.error(taskErr.message || "Failed to create task");
      } else {
        // Log task created & assigned in activity_log
        await logActivity(activeOrg.id, 'task', newTask.id, 'created', { title: newTask.title, goal_id: goal.id, assignee_id: assignedUserId });
        await logActivity(activeOrg.id, 'task', newTask.id, 'assigned', { assignee_id: assignedUserId });

        await recomputeGoalProgressAndRisk(goal.id);
        toast.success("Task created successfully!");
        setTaskTitle("");
        setTaskDesc("");
        setTaskWeight(1);
        setTaskDeadline("");
        setTaskBlockedBy("");
        setTaskRequiresApproval(false);
        setShowTaskModal(false);
        loadData();
      }
    } catch (err) {
      toast.error("Error creating task");
    } finally {
      setSubmittingTask(false);
    }
  }

  // Complete / Toggle Task (No approval required)
  async function handleCompleteTask(task) {
    if (task.approval_status === 'pending') {
      toast("This task requires manager approval. Click 'Submit for Review'.", { icon: "ℹ️" });
      return;
    }

    const newCompleted = !task.completed;
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      .eq('id', task.id);

    if (error) {
      toast.error(error.message);
    } else {
      if (newCompleted) {
        await logActivity(activeOrg.id, 'task', task.id, 'completed');
        toast.success("Task completed!");
      }
      await recomputeGoalProgressAndRisk(goal.id);
      loadData();
    }
  }

  // Submit Task for Review (Assignee)
  async function handleSubmitForReview(task) {
    try {
      await logActivity(activeOrg.id, 'task', task.id, 'submitted_for_review');
      toast.success("Submitted task for manager review!");
      loadData();
    } catch (err) {
      toast.error("Failed submitting for review");
    }
  }

  // Approve Task (Reviewer / Owner / Manager)
  async function handleApproveTask(task) {
    if (!canManageGoal) {
      toast.error("Only Owners and Managers can approve tasks");
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          approval_status: 'approved',
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) {
        toast.error(error.message);
      } else {
        await logActivity(activeOrg.id, 'task', task.id, 'approved');
        await recomputeGoalProgressAndRisk(goal.id);
        toast.success("Task approved & completed!");
        loadData();
      }
    } catch (err) {
      toast.error("Error approving task");
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

          {canManageGoal && (
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

      {/* Manual Progress Override Control Panel */}
      <div style={{
        background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
        padding: "28px", marginBottom: "24px"
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚡ Manual Progress Override Mechanism
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: textMuted }}>
          {canManageGoal
            ? "Owners and Managers can explicitly override the computed progress value for executive reporting."
            : "Only Owners and Managers have access to override progress controls."}
        </p>

        {canManageGoal ? (
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
                  background: "#f59e0b", color: "white", fontWeight: "700", fontSize: "13px"
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

            {hasOverride && (
              <div style={{
                padding: "14px 18px", borderRadius: "10px",
                background: darkMode ? "rgba(245,158,11,0.1)" : "#fffbeb",
                border: "1px solid rgba(245,158,11,0.3)", fontSize: "13px", color: darkMode ? "#fbbf24" : "#b45309"
              }}>
                <strong>Audit Record:</strong> Override of <strong>{goal.progress_override}%</strong> set on{" "}
                {new Date(goal.progress_override_at).toLocaleString()}.<br />
                <span>Previous computed progress: <strong>{goal.progress_override_previous ?? 0}%</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "14px 18px", borderRadius: "10px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${borderCol}`, fontSize: "13px", color: textMuted }}>
            🔒 Read-only view for Employee / Guest role.
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            Tasks under this Goal
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
            {tasks.length} Task{tasks.length !== 1 ? "s" : ""} registered
          </p>
        </div>

        {canCreateTask && (
          <button
            onClick={() => setShowTaskModal(true)}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontWeight: "700", fontSize: "14px", boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
            }}
          >
            + Add Task
          </button>
        )}
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", background: cardBg, borderRadius: "16px",
          border: `1px dashed ${borderCol}`
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: darkMode ? "#f8fafc" : "#0f172a" }}>
            No tasks under this goal yet
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: textMuted }}>
            Goals render cleanly with zero tasks. Add tasks to define work items.
          </p>
          {canCreateTask && (
            <button
              onClick={() => setShowTaskModal(true)}
              style={{
                padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "#6366f1", color: "white", fontWeight: "600", fontSize: "13px"
              }}
            >
              + Add First Task
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {tasks.map(t => {
            const isCompleted = t.completed;
            const isPendingApproval = t.approval_status === 'pending';
            const isApproved = t.approval_status === 'approved';
            const blockedTask = tasks.find(bt => bt.id === t.blocked_by);

            return (
              <div
                key={t.id}
                style={{
                  background: cardBg, borderRadius: "14px", border: `1px solid ${borderCol}`,
                  padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  flexWrap: "wrap", gap: "14px"
                }}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <h4 style={{
                      margin: 0, fontSize: "15px", fontWeight: "700",
                      color: isCompleted ? textMuted : (darkMode ? "#f8fafc" : "#0f172a"),
                      textDecoration: isCompleted ? "line-through" : "none"
                    }}>
                      {t.title}
                    </h4>

                    {/* Weight Badge */}
                    <span style={{
                      padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
                      background: darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                      color: darkMode ? "#cbd5e1" : "#475569"
                    }}>
                      Weight: {t.weight || 1}
                    </span>

                    {/* Approval Status Badge */}
                    {isPendingApproval && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(245,158,11,0.2)", color: "#f59e0b"
                      }}>
                        ⏳ Pending Approval
                      </span>
                    )}
                    {isApproved && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(34,197,94,0.15)", color: "#4ade80"
                      }}>
                        ✓ Approved
                      </span>
                    )}

                    {/* Blocked By Visual Flag */}
                    {t.blocked_by && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(239,68,68,0.15)", color: "#f87171"
                      }}>
                        🔒 Blocked by: {blockedTask ? blockedTask.title : "Another Task"}
                      </span>
                    )}
                  </div>

                  {t.description && (
                    <p style={{ margin: "0 0 6px", fontSize: "13px", color: textMuted }}>
                      {t.description}
                    </p>
                  )}

                  {t.deadline && (
                    <span style={{ fontSize: "12px", color: textMuted }}>
                      📅 Deadline: {new Date(t.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Actions (Complete / Submit / Approve / Comments) */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => setSelectedTask(t)}
                    style={{
                      padding: "8px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                      background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#818cf8" : "#6366f1",
                      fontWeight: "600", fontSize: "13px", cursor: "pointer"
                    }}
                  >
                    💬 Comments & History
                  </button>

                  {t.approval_status === 'not_required' && (
                    <button
                      onClick={() => handleCompleteTask(t)}
                      style={{
                        padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                        background: isCompleted ? (darkMode ? "#0f172a" : "#f1f5f9") : "#22c55e",
                        color: isCompleted ? textMuted : "white", fontWeight: "600", fontSize: "13px"
                      }}
                    >
                      {isCompleted ? "✓ Completed" : "Mark Complete"}
                    </button>
                  )}

                  {isPendingApproval && !isCompleted && (
                    <>
                      <button
                        onClick={() => handleSubmitForReview(t)}
                        style={{
                          padding: "8px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                          background: darkMode ? "#0f172a" : "#f8fafc", color: darkMode ? "#fbbf24" : "#b45309",
                          fontWeight: "600", fontSize: "13px", cursor: "pointer"
                        }}
                      >
                        Submit for Review
                      </button>

                      {canManageGoal && (
                        <button
                          onClick={() => handleApproveTask(t)}
                          style={{
                            padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                            background: "#22c55e", color: "white", fontWeight: "700", fontSize: "13px"
                          }}
                        >
                          ✓ Approve Task
                        </button>
                      )}
                    </>
                  )}

                  {isApproved && (
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#4ade80" }}>
                      ✅ Completed & Approved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
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
                Add Task to Goal
              </h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              {/* Title */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Task Title *
                </label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement API Endpoint"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Assignee & Weight Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                    Assignee *
                  </label>
                  {isEmployee ? (
                    <input
                      disabled
                      value="Self (Employee)"
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: "10px",
                        border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#e2e8f0",
                        color: textMuted, fontSize: "14px", boxSizing: "border-box"
                      }}
                    />
                  ) : (
                    <select
                      required
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: "10px",
                        border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                        color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                      }}
                    >
                      <option value="">-- Select Member --</option>
                      {membersList.map(m => (
                        <option key={m.id} value={m.user_id}>{m.user_id.slice(0, 8)}... ({m.role})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={taskWeight}
                    onChange={(e) => setTaskWeight(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                      color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Deadline & Blocked By Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                      color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                    Blocked By (Optional)
                  </label>
                  <select
                    value={taskBlockedBy}
                    onChange={(e) => setTaskBlockedBy(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                      color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box"
                    }}
                  >
                    <option value="">-- None --</option>
                    {tasks.map(st => (
                      <option key={st.id} value={st.id}>{st.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              {/* Requires Approval Toggle */}
              <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="reqApp"
                  checked={taskRequiresApproval}
                  onChange={(e) => setTaskRequiresApproval(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="reqApp" style={{ fontSize: "14px", fontWeight: "600", color: darkMode ? "#cbd5e1" : "#334155", cursor: "pointer" }}>
                  Requires Manager Approval upon completion
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#cbd5e1" : "#475569", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submittingTask ? 0.6 : 1
                  }}
                >
                  {submittingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Task Detail Modal (Comments & Activity Feed) */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        darkMode={darkMode}
        activeOrg={activeOrg}
        userRole={userRole}
        onTaskUpdate={loadData}
      />
    </div>
  );
}
