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

  // Milestones State
  const [milestones, setMilestones] = useState([]);
  const [showMsModal, setShowMsModal] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msWeight, setMsWeight] = useState(1);
  const [submittingMs, setSubmittingMs] = useState(false);

  // Project Docs State
  const [projectDocs, setProjectDocs] = useState([]);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Milestone Override State
  const [showMsOverrideModal, setShowMsOverrideModal] = useState(false);
  const [selectedMsForOverride, setSelectedMsForOverride] = useState(null);
  const [msOverrideInput, setMsOverrideInput] = useState("");
  const [submittingMsOverride, setSubmittingMsOverride] = useState(false);

  // Selected Milestone for Task Creation
  const [selectedMsForTask, setSelectedMsForTask] = useState(null);

  // AI Task Proposal Generation State
  const [aiProposals, setAiProposals] = useState([]);
  const [aiProposalsLoading, setAiProposalsLoading] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [selectedMsForAI, setSelectedMsForAI] = useState(null);

  const canManageGoal = userRole === 'owner' || userRole === 'manager';
  const isEmployee = userRole === 'employee';

  async function handleSuggestTasks() {
    if (!canManageGoal) return;
    setAiProposalsLoading(true);
    try {
      const existingTitles = tasks.map(t => t.title);
      const membersContext = membersList.map(m => ({ user_id: m.user_id, role: m.role }));

      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/ai-task-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalTitle: goal.title,
          goalDescription: goal.description,
          existingTaskTitles: existingTitles,
          orgMembers: membersContext
        })
      });

      if (!res.ok) throw new Error("Failed to fetch task proposals");

      const data = await res.json();
      const formatted = (data.proposals || []).map(p => ({
        title: p.title || "",
        description: p.description || "",
        deadline: p.suggestedDeadline || "",
        assignee_id: p.suggestedAssigneeId || currentUserId,
        weight: 1
      }));

      setAiProposals(formatted);
      setShowProposalsModal(true);

      if (formatted.length === 0) {
        toast("No task proposals returned.", { icon: "ℹ️" });
      } else {
        toast.success(`Generated ${formatted.length} proposed tasks for review!`);
      }
    } catch (err) {
      console.error("AI Task Proposals Error:", err);
      toast.error("Failed to generate task proposals. Please try again.");
    } finally {
      setAiProposalsLoading(false);
    }
  }

  function handleUpdateProposalField(index, field, value) {
    setAiProposals(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRejectProposal(index) {
    setAiProposals(prev => prev.filter((_, i) => i !== index));
    toast("Task proposal discarded", { icon: "🗑️" });
  }

  function handleDiscardAllProposals() {
    setAiProposals([]);
    setShowProposalsModal(false);
    toast("All task proposals discarded", { icon: "🗑️" });
  }

  async function handleAcceptProposal(index) {
    const prop = aiProposals[index];
    if (!prop || !prop.title.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    const assignedUserId = prop.assignee_id || currentUserId;
    const targetMsId = selectedMsForAI ? selectedMsForAI.id : (milestones.length > 0 ? milestones[0].id : null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          org_id: activeOrg.id,
          goal_id: goal.id,
          milestone_id: targetMsId,
          title: prop.title.trim(),
          description: prop.description?.trim() || null,
          weight: Number(prop.weight) || 1,
          deadline: prop.deadline || null,
          assignee_id: assignedUserId,
          assigner_id: user?.id,
          reviewer_id: user?.id,
          approval_status: 'not_required',
          ai_generated: true,
          completed: false
        })
        .select()
        .single();

      if (taskErr) {
        toast.error(taskErr.message || "Failed to create task");
      } else {
        await logActivity(activeOrg.id, 'task', newTask.id, 'created', { title: newTask.title, goal_id: goal.id, assignee_id: assignedUserId, ai_generated: true });
        await logActivity(activeOrg.id, 'task', newTask.id, 'assigned', { assignee_id: assignedUserId });
        await recomputeGoalProgressAndRisk(goal.id);

        toast.success(`Task "${newTask.title}" accepted & created!`);

        const updated = aiProposals.filter((_, i) => i !== index);
        setAiProposals(updated);
        if (updated.length === 0) setShowProposalsModal(false);

        loadData();
      }
    } catch (err) {
      toast.error("Error creating accepted task");
    }
  }

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

      // 2. Fetch parent project & docs
      if (goalData.project_id) {
        const { data: projData } = await supabase
          .from('projects')
          .select('id, title, department_id')
          .eq('id', goalData.project_id)
          .single();
        if (projData) setProject(projData);

        const { data: docsData } = await supabase
          .from('project_docs')
          .select('*')
          .eq('project_id', goalData.project_id)
          .order('updated_at', { ascending: false });
        setProjectDocs(docsData || []);
      }

      // 3. Fetch Milestones for this goal
      const { data: msData } = await supabase
        .from('milestones')
        .select('*')
        .eq('goal_id', id)
        .eq('org_id', activeOrg.id)
        .order('created_at', { ascending: true });

      setMilestones(msData || []);

      // 4. Fetch tasks with subtasks for this goal
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select('*, subtasks(*)')
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

  // Milestone Handlers
  async function handleCreateMilestone(e) {
    e.preventDefault();
    if (!canManageGoal) {
      toast.error("Permission denied: Only Owner/Manager roles can create milestones.");
      return;
    }
    if (!msTitle.trim()) return;

    setSubmittingMs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          org_id: activeOrg.id,
          goal_id: goal.id,
          title: msTitle.trim(),
          description: msDesc.trim() || null,
          weight: Number(msWeight) || 1,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message || "Failed to create milestone");
      } else {
        toast.success("Milestone created!");
        setShowMsModal(false);
        setMsTitle("");
        setMsDesc("");
        setMsWeight(1);
        await recomputeGoalProgressAndRisk(goal.id);
        loadData();
      }
    } catch (err) {
      toast.error("Error creating milestone");
    } finally {
      setSubmittingMs(false);
    }
  }

  async function handleSetMilestoneOverride(e) {
    e.preventDefault();
    if (!canManageGoal || !selectedMsForOverride) return;

    const numVal = Number(msOverrideInput);
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      toast.error("Please enter a valid override percentage (0 - 100)");
      return;
    }

    setSubmittingMsOverride(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const prevVal = selectedMsForOverride.progress_override !== null ? selectedMsForOverride.progress_override : selectedMsForOverride.progress_computed;

      const { error } = await supabase
        .from('milestones')
        .update({
          progress_override: numVal,
          progress_override_by: user?.id,
          progress_override_at: new Date().toISOString(),
          progress_override_previous: prevVal
        })
        .eq('id', selectedMsForOverride.id);

      if (error) {
        toast.error(error.message || "Failed to set milestone override");
      } else {
        toast.success("Milestone override saved!");
        setShowMsOverrideModal(false);
        await recomputeGoalProgressAndRisk(goal.id);
        loadData();
      }
    } catch (err) {
      toast.error("Error setting milestone override");
    } finally {
      setSubmittingMsOverride(false);
    }
  }

  async function handleClearMilestoneOverride(milestone) {
    if (!canManageGoal || !milestone) return;

    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          progress_override: null,
          progress_override_by: null,
          progress_override_at: null,
          progress_override_previous: milestone.progress_override
        })
        .eq('id', milestone.id);

      if (error) {
        toast.error(error.message || "Failed to clear override");
      } else {
        toast.success("Milestone override cleared!");
        await recomputeGoalProgressAndRisk(goal.id);
        loadData();
      }
    } catch (err) {
      toast.error("Error clearing milestone override");
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
      const targetMilestoneId = selectedMsForTask ? selectedMsForTask.id : (milestones.length > 0 ? milestones[0].id : null);

      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          org_id: activeOrg.id,
          goal_id: goal.id,
          milestone_id: targetMilestoneId,
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          weight: Number(taskWeight) || 1,
          deadline: taskDeadline || null,
          assignee_id: assignedUserId,
          assigner_id: user?.id,
          reviewer_id: user?.id, // defaults to assigner
          approval_status: approvalStatus,
          blocked_by: (taskBlockedBy && taskBlockedBy.trim() !== '') ? taskBlockedBy.trim() : null,
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

  const cardBg = darkMode ? "#1E140C" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5";
  const textMuted = darkMode ? "#B3A18C" : "#9C8B76";

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
        <Link to="/projects" style={{ color: "#f15e1c", textDecoration: "none", fontWeight: "600" }}>Projects</Link>
        <span>/</span>
        {project && (
          <>
            <Link to={`/projects/${project.id}`} style={{ color: "#f15e1c", textDecoration: "none", fontWeight: "600" }}>
              {project.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span style={{ color: darkMode ? "#D5C2A5" : "#6E5D4B" }}>{goal.title}</span>
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
                background: "rgba(241, 94, 28, 0.15)", color: "#f15e1c", textTransform: "uppercase"
              }}>
                🎯 Goal
              </span>

              <span style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
                background: darkMode ? "rgba(255,255,255,0.08)" : "#FFF3E2",
                color: darkMode ? "#D5C2A5" : "#6E5D4B"
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

            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              {goal.title}
            </h1>

            {goal.description && (
              <p style={{ margin: 0, fontSize: "15px", color: textMuted, lineHeight: "1.6" }}>
                {goal.description}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => setShowDocsModal(true)}
              style={{
                padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(241, 94, 28, 0.4)",
                background: darkMode ? "rgba(241, 94, 28, 0.15)" : "#FFF3E2",
                color: "#f15e1c", fontWeight: "700", fontSize: "13px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s ease"
              }}
            >
              📄 Project Docs ({projectDocs.length})
            </button>

            {canManageGoal && (
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  padding: "9px 16px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                  background: darkMode ? "#2E2013" : "#FFF8EF", color: darkMode ? "#FFF8EF" : "#2E2013",
                  fontWeight: "600", fontSize: "13px", cursor: "pointer"
                }}
              >
                ✏️ Edit Goal
              </button>
            )}
          </div>
        </div>

        {/* Progress Display Gauge */}
        <div style={{
          padding: "24px", borderRadius: "14px",
          background: darkMode ? "#2E2013" : "#FFF8EF", border: `1px solid ${borderCol}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              {hasOverride ? "Effective Progress (Overridden)" : "Computed Progress"}
            </span>
            <span style={{ fontSize: "20px", fontWeight: "800", color: hasOverride ? "#f59e0b" : "#f15e1c" }}>
              {Math.round(effectiveProgress)}%
            </span>
          </div>

          <div style={{ height: "12px", background: darkMode ? "#1E140C" : "#E8D9C5", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, Math.max(0, effectiveProgress))}%`,
              background: hasOverride ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #f15e1c, #fab60a)",
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
        <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013", display: "flex", alignItems: "center", gap: "8px" }}>
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
                <label style={{ fontSize: "14px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
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
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", fontWeight: "600"
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
                    background: darkMode ? "#2E2013" : "#FFF8EF", color: darkMode ? "#f87171" : "#dc2626",
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
          <div style={{ padding: "14px 18px", borderRadius: "10px", background: darkMode ? "#2E2013" : "#FFF8EF", border: `1px solid ${borderCol}`, fontSize: "13px", color: textMuted }}>
            🔒 Read-only view for Employee / Guest role.
          </div>
        )}
      </div>

      {/* Milestones Hierarchy Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
            🚀 Milestones & Execution Breakdown
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
            {milestones.length} Milestone{milestones.length !== 1 ? "s" : ""} defined • {tasks.length} Total Task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {canManageGoal && (
            <button
              onClick={() => setShowMsModal(true)}
              style={{
                padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #2e936f, #24785a)", color: "white",
                fontWeight: "700", fontSize: "13.5px", boxShadow: "0 4px 12px rgba(46, 147, 111, 0.3)"
              }}
            >
              + Add Milestone
            </button>
          )}

          {canManageGoal && (
            <button
              onClick={handleSuggestTasks}
              disabled={aiProposalsLoading}
              style={{
                padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(250, 182, 10, 0.4)",
                background: darkMode ? "rgba(250, 182, 10, 0.15)" : "#f3e8ff",
                color: darkMode ? "#fab60a" : "#7e22ce",
                fontWeight: "700", fontSize: "13.5px", cursor: aiProposalsLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "6px", opacity: aiProposalsLoading ? 0.7 : 1,
                transition: "all 0.15s ease"
              }}
            >
              {aiProposalsLoading ? <span className="spinner" /> : "✨"} AI Suggest Tasks
            </button>
          )}
        </div>
      </div>

      {/* Render Milestones */}
      {milestones.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", background: cardBg, borderRadius: "16px",
          border: `1px dashed ${borderCol}`, marginBottom: "24px"
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏁</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
            No milestones added to this goal yet
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: textMuted }}>
            Milestones group tasks into key delivery targets. Add a milestone to organize work items.
          </p>
          {canManageGoal && (
            <button
              onClick={() => setShowMsModal(true)}
              style={{
                padding: "9px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
                background: "#2e936f", color: "white", fontWeight: "600", fontSize: "13px"
              }}
            >
              + Add First Milestone
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
          {milestones.map((ms) => {
            const msTasks = tasks.filter(t => t.milestone_id === ms.id);
            const msHasOverride = ms.progress_override !== null && ms.progress_override !== undefined;
            const msEffProgress = msHasOverride ? Number(ms.progress_override) : Number(ms.progress_computed || 0);

            return (
              <div
                key={ms.id}
                style={{
                  background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`,
                  padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
                }}
              >
                {/* Milestone Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(46, 147, 111, 0.15)", color: "#2e936f", textTransform: "uppercase"
                      }}>
                        🏁 Milestone
                      </span>
                      <span style={{ fontSize: "12px", color: textMuted }}>Weight: {ms.weight || 1}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
                        background: ms.risk_flag === 'overdue' ? 'rgba(239,68,68,0.2)' : ms.risk_flag === 'at_risk' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)',
                        color: ms.risk_flag === 'overdue' ? '#f87171' : ms.risk_flag === 'at_risk' ? '#f59e0b' : '#4ade80'
                      }}>
                        Risk: {ms.risk_flag || 'none'}
                      </span>
                      {msHasOverride && (
                        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                          ⚡ Override: {ms.progress_override}%
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                      {ms.title}
                    </h3>
                    {ms.description && (
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: textMuted }}>{ms.description}</p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {canManageGoal && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedMsForOverride(ms);
                            setMsOverrideInput(ms.progress_override !== null ? String(ms.progress_override) : "");
                            setShowMsOverrideModal(true);
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                            background: darkMode ? "#2E2013" : "#FFF8EF", color: "#f59e0b",
                            fontWeight: "600", fontSize: "12px", cursor: "pointer"
                          }}
                        >
                          ⚡ Override
                        </button>

                        {msHasOverride && (
                          <button
                            onClick={() => handleClearMilestoneOverride(ms)}
                            style={{
                              padding: "6px 12px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                              background: darkMode ? "#2E2013" : "#FFF8EF", color: "#f87171",
                              fontWeight: "600", fontSize: "12px", cursor: "pointer"
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </>
                    )}

                    {canManageGoal && (
                      <button
                        onClick={() => {
                          setSelectedMsForAI(ms);
                          setAiProposals([
                            { id: `ms-prop-1-${ms.id}`, title: `Build ${ms.title} core deliverables`, description: `Initial setup and delivery tasks for ${ms.title}`, weight: 1 },
                            { id: `ms-prop-2-${ms.id}`, title: `Execute ${ms.title} integration verification`, description: `Run verification tests for ${ms.title}`, weight: 1 },
                            { id: `ms-prop-3-${ms.id}`, title: `Finalize ${ms.title} documentation & launch`, description: `Deployment checklist for ${ms.title}`, weight: 1 }
                          ]);
                          setShowProposalsModal(true);
                        }}
                        style={{
                          padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(250, 182, 10, 0.4)",
                          background: darkMode ? "rgba(250, 182, 10, 0.15)" : "#f3e8ff",
                          color: darkMode ? "#fab60a" : "#7e22ce",
                          fontWeight: "600", fontSize: "12px", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "4px"
                        }}
                      >
                        ✨ AI Tasks
                      </button>
                    )}

                    {canCreateTask && (
                      <button
                        onClick={() => {
                          setSelectedMsForTask(ms);
                          setShowTaskModal(true);
                        }}
                        style={{
                          padding: "6px 12px", borderRadius: "8px", border: "none",
                          background: "#f15e1c", color: "white", fontWeight: "600", fontSize: "12px", cursor: "pointer"
                        }}
                      >
                        + Task
                      </button>
                    )}
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>
                    <span style={{ color: textMuted }}>Milestone Progress</span>
                    <span style={{ color: msHasOverride ? "#f59e0b" : "#2e936f" }}>{Math.round(msEffProgress)}%</span>
                  </div>
                  <div style={{ height: "8px", background: darkMode ? "#2E2013" : "#E8D9C5", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${Math.min(100, Math.max(0, msEffProgress))}%`,
                      background: msHasOverride ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #2e936f, #24785a)",
                      borderRadius: "6px", transition: "width 0.25s ease"
                    }} />
                  </div>
                </div>

                {/* Tasks List under Milestone */}
                {msTasks.length === 0 ? (
                  <div style={{ padding: "14px", borderRadius: "10px", background: darkMode ? "#2E2013" : "#FFF8EF", fontSize: "12.5px", color: textMuted, textAlign: "center" }}>
                    No tasks assigned to this milestone yet. Click "+ Task" above to add one.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {msTasks.map(t => {
                      const completedSubtasksCount = (t.subtasks || []).filter(s => s.completed).length;
                      const totalSubtasksCount = (t.subtasks || []).length;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          style={{
                            padding: "12px 16px", borderRadius: "12px",
                            background: darkMode ? "#2E2013" : "#FFF8EF",
                            border: `1px solid ${borderCol}`, display: "flex", justifyContent: "space-between",
                            alignItems: "center", cursor: "pointer", transition: "all 0.15s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "16px" }}>{t.completed ? "✅" : "📋"}</span>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "14px", color: t.completed ? textMuted : (darkMode ? "#FFF8EF" : "#2E2013"), textDecoration: t.completed ? "line-through" : "none" }}>
                                {t.title}
                              </div>
                              <div style={{ fontSize: "11px", color: textMuted, display: "flex", gap: "10px", marginTop: "2px" }}>
                                <span>Weight: {t.weight || 1}</span>
                                {totalSubtasksCount > 0 && (
                                  <span style={{ color: "#f15e1c", fontWeight: "600" }}>
                                    ☑️ Subtasks: {completedSubtasksCount}/{totalSubtasksCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(t);
                            }}
                            style={{
                              padding: "4px 10px", borderRadius: "6px", border: `1px solid ${borderCol}`,
                              background: "transparent", color: textMuted, fontSize: "12px", cursor: "pointer"
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", background: cardBg, borderRadius: "16px",
          border: `1px dashed ${borderCol}`
        }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
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
                background: "#f15e1c", color: "white", fontWeight: "600", fontSize: "13px"
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
                      color: isCompleted ? textMuted : (darkMode ? "#FFF8EF" : "#2E2013"),
                      textDecoration: isCompleted ? "line-through" : "none"
                    }}>
                      {t.title}
                    </h4>

                    {/* Weight Badge */}
                    <span style={{
                      padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600",
                      background: darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5",
                      color: darkMode ? "#D5C2A5" : "#6E5D4B"
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
                      background: darkMode ? "#2E2013" : "#FFF8EF", color: darkMode ? "#f15e1c" : "#f15e1c",
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
                        background: isCompleted ? (darkMode ? "#2E2013" : "#FFF3E2") : "#22c55e",
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
                          background: darkMode ? "#2E2013" : "#FFF8EF", color: darkMode ? "#fbbf24" : "#b45309",
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
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                Add Task to Goal
              </h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              {/* Title */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Task Title *
                </label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement API Endpoint"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Assignee & Weight Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                    Assignee *
                  </label>
                  {isEmployee ? (
                    <input
                      disabled
                      value="Self (Employee)"
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: "10px",
                        border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#E8D9C5",
                        color: textMuted, fontSize: "14px", boxSizing: "border-box"
                      }}
                    />
                  ) : (
                    <select
                      required
                      value={taskAssigneeId}
                      onChange={(e) => setTaskAssigneeId(e.target.value)}
                      className="form-select"
                      style={{
                        width: "100%", padding: "11px 38px 11px 14px", borderRadius: "10px",
                        border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                        color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box", cursor: "pointer"
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
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
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
                      border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                      color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Deadline & Blocked By Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                      color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                    Blocked By (Optional)
                  </label>
                  <select
                    value={taskBlockedBy}
                    onChange={(e) => setTaskBlockedBy(e.target.value)}
                    className="form-select"
                    style={{
                      width: "100%", padding: "11px 38px 11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                      color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box", cursor: "pointer"
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
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box",
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
                <label htmlFor="reqApp" style={{ fontSize: "14px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C", cursor: "pointer" }}>
                  Requires Manager Approval upon completion
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#D5C2A5" : "#6E5D4B", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #f15e1c, #fab60a)", color: "white",
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
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                Edit Goal
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleEditGoal}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Goal Title *
                </label>
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
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
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box",
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
                    background: "none", color: darkMode ? "#D5C2A5" : "#6E5D4B", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #f15e1c, #fab60a)", color: "white",
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

      {/* Create Milestone Modal */}
      {showMsModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "500px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                Add New Milestone
              </h2>
              <button onClick={() => setShowMsModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateMilestone}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Milestone Title *
                </label>
                <input
                  required
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  placeholder="e.g. Phase 1 Core Infrastructure"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Weight (Numeric, default 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={msWeight}
                  onChange={(e) => setMsWeight(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={msDesc}
                  onChange={(e) => setMsDesc(e.target.value)}
                  placeholder="Summary of milestone deliverables..."
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowMsModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#D5C2A5" : "#6E5D4B", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMs}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #2e936f, #24785a)", color: "white",
                    fontWeight: "700", cursor: "pointer", opacity: submittingMs ? 0.6 : 1
                  }}
                >
                  {submittingMs ? "Creating..." : "Create Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Milestone Override Modal */}
      {showMsOverrideModal && selectedMsForOverride && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "450px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                ⚡ Milestone Manual Override
              </h3>
              <button onClick={() => setShowMsOverrideModal(false)} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <p style={{ fontSize: "13px", color: textMuted, marginBottom: "20px" }}>
              Set explicit progress override for <strong>{selectedMsForOverride.title}</strong>.
            </p>

            <form onSubmit={handleSetMilestoneOverride}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: darkMode ? "#D5C2A5" : "#4A3C2C" }}>
                  Override Percentage (0 - 100) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={msOverrideInput}
                  onChange={(e) => setMsOverrideInput(e.target.value)}
                  placeholder="e.g. 75"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#2E2013" : "#FFF8EF",
                    color: darkMode ? "#FFF8EF" : "#2E2013", outline: "none", fontSize: "14px", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowMsOverrideModal(false)}
                  style={{
                    padding: "10px 18px", borderRadius: "10px", border: `1px solid ${borderCol}`,
                    background: "none", color: darkMode ? "#D5C2A5" : "#6E5D4B", fontWeight: "600", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMsOverride}
                  style={{
                    padding: "10px 22px", borderRadius: "10px", border: "none",
                    background: "#f59e0b", color: "white", fontWeight: "700", cursor: "pointer",
                    opacity: submittingMsOverride ? 0.6 : 1
                  }}
                >
                  {submittingMsOverride ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Task Proposals Review Modal */}
      {showProposalsModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013", display: "flex", alignItems: "center", gap: "8px" }}>
                  ✨ Review AI Task Proposals
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
                  Edit proposals below. Nothing is saved to the database until you click <strong>Accept</strong>.
                </p>
              </div>

              <button
                onClick={handleDiscardAllProposals}
                style={{
                  padding: "6px 14px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                  background: darkMode ? "#2E2013" : "#FFF8EF", color: darkMode ? "#f87171" : "#dc2626",
                  fontSize: "12px", fontWeight: "600", cursor: "pointer"
                }}
              >
                Discard All
              </button>
            </div>

            {aiProposals.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: textMuted, fontSize: "14px" }}>
                No task proposals available.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {aiProposals.map((prop, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "20px", borderRadius: "14px",
                      background: darkMode ? "#2E2013" : "#FFF8EF", border: `1px solid ${borderCol}`,
                      display: "flex", flexDirection: "column", gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                        background: "rgba(250, 182, 10, 0.15)", color: "#fab60a", textTransform: "uppercase"
                      }}>
                        ✨ Proposed Task #{idx + 1}
                      </span>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => handleRejectProposal(idx)}
                          style={{
                            padding: "6px 12px", borderRadius: "8px", border: `1px solid ${borderCol}`,
                            background: "transparent", color: darkMode ? "#f87171" : "#dc2626",
                            fontSize: "12px", fontWeight: "600", cursor: "pointer"
                          }}
                        >
                          ✕ Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptProposal(idx)}
                          style={{
                            padding: "6px 16px", borderRadius: "8px", border: "none",
                            background: "#22c55e", color: "white",
                            fontSize: "12px", fontWeight: "700", cursor: "pointer"
                          }}
                        >
                          ✓ Accept & Create
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: textMuted }}>
                        Title
                      </label>
                      <input
                        type="text"
                        value={prop.title}
                        onChange={(e) => handleUpdateProposalField(idx, "title", e.target.value)}
                        style={{
                          width: "100%", padding: "9px 12px", borderRadius: "8px",
                          border: `1px solid ${borderCol}`, background: darkMode ? "#1E140C" : "#ffffff",
                          color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "14px", outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: textMuted }}>
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={prop.description}
                        onChange={(e) => handleUpdateProposalField(idx, "description", e.target.value)}
                        style={{
                          width: "100%", padding: "9px 12px", borderRadius: "8px",
                          border: `1px solid ${borderCol}`, background: darkMode ? "#1E140C" : "#ffffff",
                          color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", outline: "none", boxSizing: "border-box",
                          fontFamily: "inherit", resize: "vertical"
                        }}
                      />
                    </div>

                    {/* Deadline, Assignee, Weight Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "10px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: textMuted }}>
                          Suggested Deadline
                        </label>
                        <input
                          type="date"
                          value={prop.deadline}
                          onChange={(e) => handleUpdateProposalField(idx, "deadline", e.target.value)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "8px",
                            border: `1px solid ${borderCol}`, background: darkMode ? "#1E140C" : "#ffffff",
                            color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", outline: "none", boxSizing: "border-box"
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: textMuted }}>
                          Assignee
                        </label>
                        <select
                          value={prop.assignee_id}
                          onChange={(e) => handleUpdateProposalField(idx, "assignee_id", e.target.value)}
                          className="form-select"
                          style={{
                            width: "100%", padding: "8px 36px 8px 10px", borderRadius: "8px",
                            border: `1px solid ${borderCol}`, background: darkMode ? "#1E140C" : "#ffffff",
                            color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", outline: "none", boxSizing: "border-box", cursor: "pointer"
                          }}
                        >
                          <option value="">-- Select Member --</option>
                          {membersList.map(m => (
                            <option key={m.id} value={m.user_id}>{m.user_id.slice(0, 8)}... ({m.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "600", color: textMuted }}>
                          Weight
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={prop.weight}
                          onChange={(e) => handleUpdateProposalField(idx, "weight", e.target.value)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "8px",
                            border: `1px solid ${borderCol}`, background: darkMode ? "#1E140C" : "#ffffff",
                            color: darkMode ? "#FFF8EF" : "#2E2013", fontSize: "13px", outline: "none", boxSizing: "border-box"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Project Docs Modal */}
      {showDocsModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div style={{
            background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
            width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto", padding: "28px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: "rgba(241, 94, 28, 0.15)", color: "#f15e1c", textTransform: "uppercase" }}>
                    📄 Project Documentation
                  </span>
                  <span style={{ fontSize: "12.5px", color: textMuted }}>
                    {project ? project.title : "Project"}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                  Project Specs & Knowledge
                </h2>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {projectDocs.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 20px", background: darkMode ? "#2E2013" : "#FFF8EF",
                borderRadius: "14px", border: `1px dashed ${borderCol}`
              }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>📄</div>
                <h4 style={{ margin: "0 0 6px", fontSize: "16px", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                  No documentation pages created yet
                </h4>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: textMuted }}>
                  Keep your team aligned by creating specs, technical architecture docs, and meeting notes.
                </p>
                {project && (
                  <Link
                    to={`/projects/${project.id}/docs`}
                    target="_blank"
                    style={{
                      padding: "9px 18px", borderRadius: "8px", background: "#f15e1c",
                      color: "white", textDecoration: "none", fontWeight: "600", fontSize: "13px", display: "inline-block"
                    }}
                  >
                    + Create First Document ↗
                  </Link>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: textMuted }}>
                    {projectDocs.length} Document{projectDocs.length !== 1 ? "s" : ""} Available
                  </span>
                  {project && (
                    <Link
                      to={`/projects/${project.id}/docs`}
                      target="_blank"
                      style={{ fontSize: "12.5px", color: "#f15e1c", fontWeight: "700", textDecoration: "none" }}
                    >
                      Open Full Docs View ↗
                    </Link>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {projectDocs.map(doc => {
                    const snippet = doc.content ? doc.content.replace(/<[^>]*>?/gm, '').slice(0, 100) : 'Empty document';
                    return (
                      <div
                        key={doc.id}
                        style={{
                          padding: "14px 18px", borderRadius: "12px",
                          background: darkMode ? "#2E2013" : "#FFF8EF",
                          border: `1px solid ${borderCol}`,
                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px"
                        }}
                      >
                        <div>
                          <h4 style={{ margin: "0 0 4px", fontSize: "14.5px", fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                            📄 {doc.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: "12.5px", color: textMuted }}>
                            {snippet}...
                          </p>
                        </div>
                        {project && (
                          <Link
                            to={`/projects/${project.id}/docs/${doc.id}`}
                            target="_blank"
                            style={{
                              padding: "6px 12px", borderRadius: "6px", border: `1px solid ${borderCol}`,
                              background: "transparent", color: "#f15e1c", fontSize: "12px", fontWeight: "600",
                              textDecoration: "none", whiteSpace: "nowrap"
                            }}
                          >
                            Read Doc ↗
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
