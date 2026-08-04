import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useOrg } from '../context/OrgContext';
import toast from 'react-hot-toast';

export default function TaskDetailModal({ task, isOpen, onClose, darkMode, activeOrg, userRole, onTaskUpdate }) {
  const { getMemberDisplayName } = useOrg() || {};
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskWeight, setNewSubtaskWeight] = useState(1);
  const [submittingSubtask, setSubmittingSubtask] = useState(false);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState("subtasks"); // "subtasks" | "comments" | "activity"

  useEffect(() => {
    if (isOpen && task && activeOrg) {
      loadSubtasks();
      loadCommentsAndActivity();
    }
  }, [isOpen, task, activeOrg]);

  async function loadSubtasks() {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setSubtasks(data);
      }
    } catch (err) {
      console.error("Failed to load subtasks:", err);
    }
  }

  async function handleToggleSubtask(subtaskId, currentStatus) {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({
          completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', subtaskId);

      if (error) {
        toast.error(error.message || "Failed to update subtask");
        return;
      }

      await loadSubtasks();
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      toast.error("Error updating subtask");
    }
  }

  async function handleAddSubtask(e) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setSubmittingSubtask(true);
    try {
      const { error } = await supabase
        .from('subtasks')
        .insert({
          org_id: activeOrg.id,
          task_id: task.id,
          title: newSubtaskTitle.trim(),
          weight: Number(newSubtaskWeight) || 1,
          completed: false
        });

      if (error) {
        toast.error(error.message || "Failed to add subtask");
        return;
      }

      toast.success("Subtask added!");
      setNewSubtaskTitle("");
      setNewSubtaskWeight(1);
      await loadSubtasks();
      if (onTaskUpdate) onTaskUpdate();
    } catch (err) {
      toast.error("Error adding subtask");
    } finally {
      setSubmittingSubtask(false);
    }
  }

  async function loadCommentsAndActivity() {
    setLoadingComments(true);
    try {
      // Fetch task comments (chat-style: newest at bottom, ascending created_at)
      const { data: commentsData, error: commErr } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (!commErr) setComments(commentsData || []);

      // Fetch per-task activity feed
      const { data: actData, error: actErr } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', 'task')
        .eq('entity_id', task.id)
        .order('created_at', { ascending: false });

      if (!actErr) setActivities(actData || []);

    } catch (err) {
      console.error("Error loading task comments & activity:", err);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert into task_comments
      const { data: commentRow, error: commErr } = await supabase
        .from('task_comments')
        .insert({
          org_id: activeOrg.id,
          task_id: task.id,
          author_id: user.id,
          body: newComment.trim()
        })
        .select()
        .single();

      if (commErr) {
        toast.error(commErr.message || "Failed to post comment");
        return;
      }

      // 2. Write row to activity_log (action = 'commented')
      await supabase.from('activity_log').insert({
        org_id: activeOrg.id,
        entity_type: 'task',
        entity_id: task.id,
        actor_id: user.id,
        action: 'commented',
        metadata: { content_snippet: newComment.trim().slice(0, 50) }
      });

      toast.success("Comment added!");
      setNewComment("");
      loadCommentsAndActivity();
    } catch (err) {
      toast.error("Error posting comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  function formatActivityText(act) {
    const timeAgo = new Date(act.created_at).toLocaleString();
    const actor = act.actor_id ? act.actor_id.slice(0, 8) + "..." : "User";

    switch (act.action) {
      case 'created':
        return `Task created by ${actor} • ${timeAgo}`;
      case 'assigned':
        return `Assigned to ${act.metadata?.assignee_id ? act.metadata.assignee_id.slice(0, 8) + '...' : 'user'} • ${timeAgo}`;
      case 'completed':
        return `Marked completed by ${actor} • ${timeAgo}`;
      case 'submitted_for_review':
        return `Submitted for manager review by ${actor} • ${timeAgo}`;
      case 'approved':
        return `Approved & marked complete by ${actor} • ${timeAgo}`;
      case 'commented':
        return `Commented: "${act.metadata?.content_snippet || '...'}" • ${timeAgo}`;
      default:
        return `${act.action} by ${actor} • ${timeAgo}`;
    }
  }

  if (!isOpen || !task) return null;

  const cardBg = darkMode ? "#1e293b" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const textMuted = darkMode ? "#94a3b8" : "#64748b";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
        width: "100%", maxWidth: "620px", maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${borderCol}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{
                  padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                  background: task.completed ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
                  color: task.completed ? "#4ade80" : "#818cf8"
                }}>
                  {task.completed ? "✓ Completed" : "📋 Task"}
                </span>

                <span style={{ fontSize: "12px", color: textMuted }}>
                  Weight: {task.weight || 1}
                </span>

                {task.approval_status === 'pending' && (
                  <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                    ⏳ Pending Review
                  </span>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: darkMode ? "#f8fafc" : "#0f172a" }}>
                {task.title}
              </h2>
            </div>

            <button onClick={onClose} style={{ background: "none", border: "none", color: textMuted, fontSize: "22px", cursor: "pointer" }}>✕</button>
          </div>

          {task.description && (
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: textMuted, lineHeight: "1.5" }}>
              {task.description}
            </p>
          )}

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "12px", marginTop: "18px", borderBottom: `1px solid ${borderCol}` }}>
            <button
              onClick={() => setActiveTab("subtasks")}
              style={{
                padding: "8px 16px", background: "none", border: "none",
                borderBottom: activeTab === "subtasks" ? "2px solid #6366f1" : "2px solid transparent",
                color: activeTab === "subtasks" ? "#6366f1" : textMuted,
                fontWeight: activeTab === "subtasks" ? "700" : "500", fontSize: "13px", cursor: "pointer"
              }}
            >
              ☑️ Subtasks Checklist ({subtasks.filter(s => s.completed).length}/{subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              style={{
                padding: "8px 16px", background: "none", border: "none",
                borderBottom: activeTab === "comments" ? "2px solid #6366f1" : "2px solid transparent",
                color: activeTab === "comments" ? "#6366f1" : textMuted,
                fontWeight: activeTab === "comments" ? "700" : "500", fontSize: "13px", cursor: "pointer"
              }}
            >
              💬 Comments ({comments.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              style={{
                padding: "8px 16px", background: "none", border: "none",
                borderBottom: activeTab === "activity" ? "2px solid #6366f1" : "2px solid transparent",
                color: activeTab === "activity" ? "#6366f1" : textMuted,
                fontWeight: activeTab === "activity" ? "700" : "500", fontSize: "13px", cursor: "pointer"
              }}
            >
              📜 Activity History ({activities.length})
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, padding: "20px 28px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {activeTab === "subtasks" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {subtasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: textMuted, fontSize: "13px" }}>
                    No subtasks added yet. Break this task down into checklist items below!
                  </div>
                ) : (
                  subtasks.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleToggleSubtask(s.id, s.completed)}
                      style={{
                        padding: "12px 16px", borderRadius: "10px",
                        background: darkMode ? "#0f172a" : "#f8fafc",
                        border: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer", transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(s.completed)}
                          onChange={() => {}} // handled by parent onClick
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <span style={{
                          fontSize: "14px", fontWeight: "600",
                          color: s.completed ? textMuted : (darkMode ? "#f8fafc" : "#0f172a"),
                          textDecoration: s.completed ? "line-through" : "none"
                        }}>
                          {s.title}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: textMuted, background: darkMode ? "rgba(255,255,255,0.05)" : "#e2e8f0", padding: "2px 8px", borderRadius: "6px" }}>
                        Weight: {s.weight || 1}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="New subtask title..."
                  required
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "13px"
                  }}
                />
                <input
                  type="number"
                  min="1"
                  value={newSubtaskWeight}
                  onChange={(e) => setNewSubtaskWeight(e.target.value)}
                  placeholder="Weight"
                  style={{
                    width: "70px", padding: "10px 10px", borderRadius: "8px",
                    border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                    color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingSubtask || !newSubtaskTitle.trim()}
                  style={{
                    padding: "10px 16px", borderRadius: "8px", border: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                    fontWeight: "700", cursor: "pointer", fontSize: "13px"
                  }}
                >
                  + Add
                </button>
              </form>
            </div>
          ) : loadingComments ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted }}>
              Loading task stream...
            </div>
          ) : activeTab === "comments" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Flat Chronological Thread (Chat-style: Newest at bottom) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {comments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: textMuted, fontSize: "13px" }}>
                    No comments yet. Start the conversation below!
                  </div>
                ) : (
                  comments.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: "12px 16px", borderRadius: "12px",
                        background: darkMode ? "#0f172a" : "#f8fafc",
                        border: `1px solid ${borderCol}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                        <span style={{ fontWeight: "700", color: darkMode ? "#cbd5e1" : "#334155" }}>
                          👤 {c.author_id ? (getMemberDisplayName ? getMemberDisplayName(c.author_id) : c.author_id.slice(0, 8) + "...") : "Author"}
                        </span>
                        <span style={{ color: textMuted }}>
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "14px", color: darkMode ? "#f8fafc" : "#0f172a", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                        {c.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} style={{ marginTop: "auto" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    style={{
                      flex: 1, padding: "11px 14px", borderRadius: "10px",
                      border: `1px solid ${borderCol}`, background: darkMode ? "#0f172a" : "#f8fafc",
                      color: darkMode ? "#f8fafc" : "#0f172a", outline: "none", fontSize: "14px"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    style={{
                      padding: "11px 20px", borderRadius: "10px", border: "none",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
                      fontWeight: "700", cursor: "pointer", opacity: submittingComment || !newComment.trim() ? 0.6 : 1
                    }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Per-task Activity Feed */
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: textMuted, fontSize: "13px" }}>
                  No activity log entries recorded.
                </div>
              ) : (
                activities.map(act => (
                  <div
                    key={act.id}
                    style={{
                      padding: "10px 14px", borderRadius: "8px",
                      background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${borderCol}`,
                      display: "flex", alignItems: "center", gap: "10px", fontSize: "13px"
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>
                      {act.action === 'created' ? '✨' : act.action === 'assigned' ? '👤' : act.action === 'completed' ? '✅' : act.action === 'approved' ? '✓' : act.action === 'commented' ? '💬' : '📌'}
                    </span>
                    <span style={{ color: darkMode ? "#cbd5e1" : "#334155" }}>
                      {formatActivityText(act)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
