import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useOrg } from "../context/OrgContext";
import {
  calculateGoalsProgress,
  calculateDepartmentProgress,
  calculateProductivityScore,
  calculateStreak,
  getTaskPriority,
  sortTasksByUrgency,
} from "../utils/rollupEngine";
import toast from "react-hot-toast";

export default function Analytics({ darkMode }) {
  const { activeOrg, userRole } = useOrg() || {};

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Data State
  const [orgGoals, setOrgGoals] = useState([]);
  const [orgTasks, setOrgTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeVariant, setActiveVariant] = useState("auto"); // "auto" | "employee" | "org"

  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';
  const isEmployee = userRole === 'employee';
  const isGuest = userRole === 'guest';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (activeOrg) {
      loadAnalyticsData();
    }
  }, [activeOrg]);

  async function loadAnalyticsData() {
    setLoading(true);
    try {
      // 1. Fetch all goals in active org
      const { data: gData } = await supabase
        .from('goals')
        .select('*')
        .eq('org_id', activeOrg.id);
      setOrgGoals(gData || []);

      // 2. Fetch all tasks in active org
      const { data: tData } = await supabase
        .from('tasks')
        .select('*')
        .eq('org_id', activeOrg.id);
      setOrgTasks(tData || []);

      // 3. Fetch departments with projects & goals for department comparison bar chart
      const { data: dData } = await supabase
        .from('departments')
        .select('*, projects(*, goals(id, weight, progress_computed, progress_override))')
        .eq('org_id', activeOrg.id);
      setDepartments(dData || []);

    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  }

  const cardBg = darkMode ? "#1E140C" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "#E8D9C5";
  const textMuted = darkMode ? "#B3A18C" : "#9C8B76";

  // 1. Guest Access Denied View
  if (isGuest) {
    return (
      <div style={{ maxWidth: "800px", margin: "40px auto", width: "100%", textAlign: "center" }}>
        <div style={{
          background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`,
          padding: "48px 32px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
            Access Denied
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: textMuted, lineHeight: "1.6" }}>
            Guests do not have access to organization analytics per security policy.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>
        Loading organization analytics...
      </div>
    );
  }

  // Determine active view mode
  const showEmployeeView = (isEmployee && activeVariant !== "org") || (activeVariant === "employee");

  // Filter tasks for employee view
  const userTasks = orgTasks.filter(t => t.assignee_id === currentUserId);
  const sortedUserTasks = sortTasksByUrgency(userTasks);

  // Org-wide calculations
  const orgGoalCompletion = calculateGoalsProgress(orgGoals);
  const now = new Date();
  const overdueTasksCount = orgTasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now).length;
  const orgProductivityScore = calculateProductivityScore(orgTasks);

  // Employee-scoped calculations
  const personalStreak = calculateStreak(userTasks);
  const personalProductivityScore = calculateProductivityScore(userTasks);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", animation: "fadeIn 0.35s ease" }}>

      {/* Header & Role Variant Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              Analytics Dashboard
            </h1>
            <span style={{
              padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
              background: "rgba(241, 94, 28, 0.15)", color: "#f15e1c", textTransform: "uppercase"
            }}>
              {showEmployeeView ? "Personal Employee View" : "Org-Wide Executive View"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: textMuted }}>
            {showEmployeeView
              ? `Personal performance metrics for your assigned tasks in ${activeOrg?.name}`
              : `Org-wide performance, department comparisons, and productivity scores for ${activeOrg?.name}`}
          </p>
        </div>

        {/* Owner/Manager Toggle Button */}
        {isOwnerOrManager && (
          <button
            onClick={() => setActiveVariant(showEmployeeView ? "org" : "employee")}
            style={{
              padding: "9px 16px", borderRadius: "10px", border: `1px solid ${borderCol}`,
              background: darkMode ? "#1E140C" : "#ffffff", color: darkMode ? "#D5C2A5" : "#6E5D4B",
              fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            {showEmployeeView ? "📊 Switch to Org Overview" : "👤 Switch to My Employee View"}
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* OWNER / MANAGER ORG-WIDE DASHBOARD (§8.1)                 */}
      {/* ========================================================= */}
      {!showEmployeeView && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Org-Wide KPI Summary Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
            {/* Org Goal Completion Rate */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                🎯 Org Goal Completion
              </span>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "#f15e1c", marginTop: "8px", marginBottom: "8px" }}>
                {orgGoalCompletion}%
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Weighted rollup across {orgGoals.length} goal{orgGoals.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Overdue Task Count */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                ❗ Overdue Tasks (Org-Wide)
              </span>
              <div style={{ fontSize: "32px", fontWeight: "800", color: overdueTasksCount > 0 ? "#ef4444" : "#22c55e", marginTop: "8px", marginBottom: "8px" }}>
                {overdueTasksCount}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Tasks past deadline requiring attention
              </p>
            </div>

            {/* Org Productivity Score */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                ⚡ Org Productivity Score
              </span>
              <div style={{
                fontSize: "32px", fontWeight: "800", marginTop: "8px", marginBottom: "8px",
                color: orgProductivityScore >= 75 ? "#2e936f" : orgProductivityScore >= 45 ? "#fab60a" : "#C13E1A"
              }}>
                {orgProductivityScore}/100
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Formula: (Done/Total * 100) - (Overdue * 5)
              </p>
            </div>
          </div>

          {/* Department Comparison Bar Chart Card */}
          <div style={{ background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`, padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              🏢 Department Completion Comparison
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: textMuted }}>
              Completion % per department using calculateDepartmentProgress rollup engine
            </p>

            {departments.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
                No departments created yet. Create departments under Projects to view comparison.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {departments.map(dept => {
                  const deptCompletion = calculateDepartmentProgress(dept.projects || []);

                  return (
                    <div key={dept.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "14px" }}>
                        <span style={{ fontWeight: "700", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
                          🏢 {dept.name}
                        </span>
                        <span style={{ fontWeight: "800", color: "#f15e1c" }}>
                          {deptCompletion}%
                        </span>
                      </div>

                      <div style={{ height: "10px", background: darkMode ? "#2E2013" : "#E8D9C5", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${Math.min(100, Math.max(0, deptCompletion))}%`,
                          background: "linear-gradient(90deg, #f15e1c, #fab60a)", borderRadius: "10px", transition: "width 0.4s ease"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMPLOYEE ANALYTICS DASHBOARD (§8.2)                        */}
      {/* ========================================================= */}
      {showEmployeeView && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Personal Summary KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
            {/* Personal Streak Counter */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                🔥 Personal Streak
              </span>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "#fab60a", marginTop: "8px", marginBottom: "8px" }}>
                {personalStreak} Day{personalStreak !== 1 ? "s" : ""}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Consecutive days with completed task activity
              </p>
            </div>

            {/* Personal Productivity Score */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                ⚡ Personal Productivity Score
              </span>
              <div style={{
                fontSize: "32px", fontWeight: "800", marginTop: "8px", marginBottom: "8px",
                color: personalProductivityScore >= 75 ? "#2e936f" : personalProductivityScore >= 45 ? "#fab60a" : "#C13E1A"
              }}>
                {personalProductivityScore}/100
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Scoped to tasks assigned to you
              </p>
            </div>

            {/* My Tasks Overview */}
            <div style={{ background: cardBg, borderRadius: "18px", border: `1px solid ${borderCol}`, padding: "22px", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: textMuted, letterSpacing: "0.05em" }}>
                📋 My Assigned Tasks
              </span>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "#f15e1c", marginTop: "8px", marginBottom: "8px" }}>
                {userTasks.filter(t => t.completed).length}/{userTasks.length}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: textMuted }}>
                Completed vs total assigned tasks
              </p>
            </div>
          </div>

          {/* Today's Assigned Tasks (Urgency Sorted) */}
          <div style={{ background: cardBg, borderRadius: "20px", border: `1px solid ${borderCol}`, padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "800", color: darkMode ? "#FFF8EF" : "#2E2013" }}>
              ⏳ Today's Assigned Tasks (Urgency Sorted)
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: textMuted }}>
              Sorted by Overdue &gt; Due Soon 48h &gt; Normal &gt; Completed
            </p>

            {sortedUserTasks.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: textMuted, fontSize: "13px" }}>
                No tasks assigned to you yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedUserTasks.map(task => {
                  const prio = getTaskPriority(task);
                  const statusLabel = prio === 1 ? "❗ Overdue" : prio === 2 ? "⏰ Due Soon" : task.completed ? "✓ Completed" : "📅 Normal";
                  const statusColor = prio === 1 ? "#C13E1A" : prio === 2 ? "#fab60a" : task.completed ? "#2e936f" : "#f15e1c";

                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: "14px 18px", borderRadius: "12px",
                        background: darkMode ? "#2E2013" : "#FFF8EF", border: `1px solid ${borderCol}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "16px" }}>{task.completed ? "✅" : "⬜"}</span>
                        <div>
                          <h4 style={{
                            margin: 0, fontSize: "14px", fontWeight: "700",
                            color: task.completed ? textMuted : (darkMode ? "#FFF8EF" : "#2E2013"),
                            textDecoration: task.completed ? "line-through" : "none"
                          }}>
                            {task.title}
                          </h4>
                          {task.deadline && (
                            <span style={{ fontSize: "12px", color: textMuted }}>
                              Deadline: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <span style={{
                        padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                        background: `${statusColor}20`, color: statusColor
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}