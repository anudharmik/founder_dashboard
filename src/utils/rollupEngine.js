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
 * Computes Project Effective Progress (weighted average of goal effective progress)
 * Formula: sum(goal.weight * goal.effective_progress) / sum(goal.weight)
 */
export function calculateProjectProgress(goalsList) {
  if (!goalsList || goalsList.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgressSum = 0;

  goalsList.forEach(g => {
    const weight = Number(g.weight) || 1;
    const effectiveProgress = g.progress_override !== null && g.progress_override !== undefined
      ? Number(g.progress_override)
      : Number(g.progress_computed || 0);

    totalWeight += weight;
    weightedProgressSum += (weight * effectiveProgress);
  });

  return totalWeight > 0 ? Number((weightedProgressSum / totalWeight).toFixed(2)) : 0;
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
