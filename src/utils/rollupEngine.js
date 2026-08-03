import { supabase } from '../supabaseClient';

/**
 * Recomputes goal.progress_computed and goal.risk_flag for a given goalId
 * and writes the updated values to the Supabase 'goals' table.
 */
export async function recomputeGoalProgressAndRisk(goalId) {
  if (!goalId) return null;

  try {
    // 1. Fetch all tasks under this goal
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, weight, completed, completed_at, deadline, approval_status')
      .eq('goal_id', goalId);

    if (error) {
      console.error("Error fetching tasks for goal rollup:", error);
      return null;
    }

    const taskList = tasks || [];
    const now = new Date();

    // 2. Compute progress_computed
    // Formula: sum(task.weight for completed & approved/not_required tasks) / sum(task.weight for all tasks) * 100
    let totalWeight = 0;
    let completedWeight = 0;

    taskList.forEach(t => {
      const w = Number(t.weight) || 1;
      totalWeight += w;

      const isTaskCompleted = Boolean(t.completed) && (t.approval_status === 'not_required' || t.approval_status === 'approved');
      if (isTaskCompleted) {
        completedWeight += w;
      }
    });

    const progressComputed = totalWeight > 0
      ? Number(((completedWeight / totalWeight) * 100).toFixed(2))
      : 0;

    // 3. Compute risk_flag
    // 'overdue' if any incomplete task has deadline < today
    // else 'at_risk' if any incomplete task has deadline within next 48h
    // else 'none'
    let riskFlag = 'none';

    const incompleteTasksWithDeadline = taskList.filter(t => {
      const isDone = Boolean(t.completed) && (t.approval_status === 'not_required' || t.approval_status === 'approved');
      return !isDone && t.deadline;
    });

    for (const t of incompleteTasksWithDeadline) {
      const deadlineDate = new Date(t.deadline);
      // Check if deadline is strictly in the past (before start of today or diff < 0)
      const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

      if (diffHours < -24 || (diffHours < 0 && deadlineDate.getDate() !== now.getDate())) {
        riskFlag = 'overdue';
        break; // Overdue is highest priority risk
      } else if (diffHours <= 48) {
        if (riskFlag !== 'overdue') {
          riskFlag = 'at_risk';
        }
      }
    }

    // 4. Update the goals table in Supabase
    const { data: updatedGoal, error: updateErr } = await supabase
      .from('goals')
      .update({
        progress_computed: progressComputed,
        risk_flag: riskFlag
      })
      .eq('id', goalId)
      .select()
      .single();

    if (updateErr) {
      console.error("Error updating goal rollup:", updateErr);
      return null;
    }

    return updatedGoal;

  } catch (err) {
    console.error("Rollup computation error:", err);
    return null;
  }
}

/**
 * Returns the effective progress of a goal (respecting manual override if set)
 */
export function calculateEffectiveProgress(goal) {
  if (!goal) return 0;
  return goal.progress_override !== null && goal.progress_override !== undefined
    ? Number(goal.progress_override)
    : Number(goal.progress_computed || 0);
}

/**
 * Computes Goal Progress (weighted average of goal effective progress across a list of goals)
 * Formula: sum(goal.weight * goal.effective_progress) / sum(goal.weight)
 */
export function calculateGoalsProgress(goalsList) {
  if (!goalsList || goalsList.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgressSum = 0;

  goalsList.forEach(g => {
    const weight = Number(g.weight) || 1;
    const effectiveProgress = calculateEffectiveProgress(g);

    totalWeight += weight;
    weightedProgressSum += (weight * effectiveProgress);
  });

  return totalWeight > 0 ? Number((weightedProgressSum / totalWeight).toFixed(2)) : 0;
}

/**
 * Computes Project Effective Progress (weighted average of goal effective progress)
 * Formula: sum(goal.weight * goal.effective_progress) / sum(goal.weight)
 */
export function calculateProjectProgress(goalsList) {
  return calculateGoalsProgress(goalsList);
}

/**
 * Computes Department Effective Progress (unweighted average of project effective progress)
 * Formula: sum(project.effective_progress) / total_projects
 */
export function calculateDepartmentProgress(projectsList) {
  if (!projectsList || projectsList.length === 0) return 0;

  let progressSum = 0;

  projectsList.forEach(p => {
    const projGoals = p.goals || [];
    const projProgress = calculateProjectProgress(projGoals);
    progressSum += projProgress;
  });

  return Number((progressSum / projectsList.length).toFixed(2));
}

/**
 * Productivity score formula: Clamp(0, 100, (completed/total * 100) - (overdue * 5))
 */
export function calculateProductivityScore(taskList) {
  if (!taskList || !taskList.length) return 0;
  const now = new Date();
  const completed = taskList.filter((t) => Boolean(t.completed)).length;
  const overdue = taskList.filter((t) => {
    if (!t.deadline || Boolean(t.completed)) return false;
    return new Date(t.deadline) < now;
  }).length;
  let score = (completed / taskList.length) * 100 - overdue * 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Personal streak counter: consecutive days with completed_at timestamp
 */
export function calculateStreak(taskList) {
  const completedWithDate = (taskList || []).filter((t) => Boolean(t.completed) && t.completed_at);
  if (!completedWithDate.length) return 0;
  const dates = [...new Set(completedWithDate.map((t) =>
    new Date(t.completed_at).toISOString().split("T")[0]
  ))].sort().reverse();
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i + 1])) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Urgency sort priority (reused in /tasks and /analytics):
 * Priority 1: Overdue (incomplete, deadline < today)
 * Priority 2: Due Soon (incomplete, deadline within 48h)
 * Priority 3: Normal (incomplete, deadline > 48h or no deadline)
 * Priority 4: Completed
 */
export function getTaskPriority(task) {
  const now = new Date();
  if (task.completed) return 4;
  if (!task.deadline) return 3;
  const diff = (new Date(task.deadline) - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 1;
  if (diff <= 2) return 2;
  return 3;
}

export function sortTasksByUrgency(taskList) {
  return [...(taskList || [])].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));
}

