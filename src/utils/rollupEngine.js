import { supabase } from '../supabaseClient.js';

/**
 * Calculates Task Completion Percentage based on its subtasks checklist.
 * If task has subtasks: percentage = (completed subtasks weight / total subtasks weight) * 100
 * If task has 0 subtasks: 100% if completed & approved/not_required, else 0%.
 */
export function calculateTaskCompletionPercentage(task, subtasksList = []) {
  if (!task) return 0;
  
  if (subtasksList && subtasksList.length > 0) {
    let totalWeight = 0;
    let completedWeight = 0;
    subtasksList.forEach(s => {
      const w = Number(s.weight) || 1;
      totalWeight += w;
      if (Boolean(s.completed)) {
        completedWeight += w;
      }
    });
    return totalWeight > 0 ? Number(((completedWeight / totalWeight) * 100).toFixed(2)) : 0;
  }

  const isCompleted = Boolean(task.completed) && 
    (task.approval_status === 'not_required' || task.approval_status === 'approved' || !task.approval_status);
  return isCompleted ? 100 : 0;
}

/**
 * Returns the effective progress of an entity (milestone or goal), respecting manual override if set.
 */
export function calculateEffectiveProgress(entity) {
  if (!entity) return 0;
  return entity.progress_override !== null && entity.progress_override !== undefined
    ? Number(entity.progress_override)
    : Number(entity.progress_computed || 0);
}

/**
 * Calculates Milestone Progress from child tasks & subtasks.
 * Formula: sum(task.weight * task.effective_progress) / sum(task.weight)
 */
export function calculateMilestoneProgress(tasksList = []) {
  if (!tasksList || tasksList.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgressSum = 0;

  tasksList.forEach(t => {
    const weight = Number(t.weight) || 1;
    const taskProgress = calculateTaskCompletionPercentage(t, t.subtasks || []);
    totalWeight += weight;
    weightedProgressSum += (weight * taskProgress);
  });

  return totalWeight > 0 ? Number((weightedProgressSum / totalWeight).toFixed(2)) : 0;
}

/**
 * Recomputes milestone.progress_computed and milestone.risk_flag for a given milestoneId
 * and updates the database, then triggers parent Goal recomputation.
 */
export async function recomputeMilestoneProgressAndRisk(milestoneId) {
  if (!milestoneId) return null;

  try {
    // 1. Fetch milestone
    const { data: milestone, error: mErr } = await supabase
      .from('milestones')
      .select('id, goal_id')
      .eq('id', milestoneId)
      .single();

    if (mErr || !milestone) {
      console.error("Error fetching milestone for rollup:", mErr);
      return null;
    }

    // 2. Fetch tasks under this milestone + subtasks
    const { data: tasks, error: tErr } = await supabase
      .from('tasks')
      .select(`
        id, weight, completed, completed_at, deadline, approval_status,
        subtasks ( id, weight, completed )
      `)
      .eq('milestone_id', milestoneId);

    if (tErr) {
      console.error("Error fetching tasks for milestone rollup:", tErr);
      return null;
    }

    const taskList = tasks || [];
    const now = new Date();

    // 3. Compute progress_computed
    const progressComputed = calculateMilestoneProgress(taskList);

    // 4. Compute risk_flag
    let riskFlag = 'none';
    const incompleteTasks = taskList.filter(t => calculateTaskCompletionPercentage(t, t.subtasks || []) < 100 && t.deadline);

    for (const t of incompleteTasks) {
      const deadlineDate = new Date(t.deadline);
      const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

      if (diffHours < -24 || (diffHours < 0 && deadlineDate.getDate() !== now.getDate())) {
        riskFlag = 'overdue';
        break;
      } else if (diffHours <= 48) {
        if (riskFlag !== 'overdue') {
          riskFlag = 'at_risk';
        }
      }
    }

    // 5. Update milestone table
    const { data: updatedMilestone, error: uErr } = await supabase
      .from('milestones')
      .update({
        progress_computed: progressComputed,
        risk_flag: riskFlag
      })
      .eq('id', milestoneId)
      .select()
      .single();

    if (uErr) {
      console.error("Error updating milestone rollup:", uErr);
      return null;
    }

    // 6. Cascade rollup to parent goal
    if (milestone.goal_id) {
      await recomputeGoalProgressAndRisk(milestone.goal_id);
    }

    return updatedMilestone;

  } catch (err) {
    console.error("Milestone rollup computation error:", err);
    return null;
  }
}

/**
 * Recomputes goal.progress_computed and goal.risk_flag for a given goalId.
 * Weighted average of child milestones' effective progress.
 */
export async function recomputeGoalProgressAndRisk(goalId) {
  if (!goalId) return null;

  try {
    // 1. Fetch child milestones
    const { data: milestones, error: mErr } = await supabase
      .from('milestones')
      .select('id, weight, progress_computed, progress_override, risk_flag')
      .eq('goal_id', goalId);

    if (mErr) {
      console.error("Error fetching milestones for goal rollup:", mErr);
      return null;
    }

    const milestonesList = milestones || [];

    let progressComputed = 0;
    let riskFlag = 'none';

    if (milestonesList.length > 0) {
      let totalWeight = 0;
      let weightedProgressSum = 0;

      milestonesList.forEach(m => {
        const weight = Number(m.weight) || 1;
        const effProgress = calculateEffectiveProgress(m);
        totalWeight += weight;
        weightedProgressSum += (weight * effProgress);

        if (m.risk_flag === 'overdue') riskFlag = 'overdue';
        else if (m.risk_flag === 'at_risk' && riskFlag !== 'overdue') riskFlag = 'at_risk';
      });

      progressComputed = totalWeight > 0
        ? Number((weightedProgressSum / totalWeight).toFixed(2))
        : 0;

    } else {
      // Fallback for goals without milestones (legacy tasks directly under goal)
      const { data: directTasks } = await supabase
        .from('tasks')
        .select('id, weight, completed, approval_status, deadline')
        .eq('goal_id', goalId)
        .is('milestone_id', null);

      if (directTasks && directTasks.length > 0) {
        let totalWeight = 0;
        let completedWeight = 0;
        const now = new Date();

        directTasks.forEach(t => {
          const w = Number(t.weight) || 1;
          totalWeight += w;
          const isDone = Boolean(t.completed) && (t.approval_status === 'not_required' || t.approval_status === 'approved');
          if (isDone) completedWeight += w;
          else if (t.deadline) {
            const diffHours = (new Date(t.deadline) - now) / (1000 * 60 * 60);
            if (diffHours < 0) riskFlag = 'overdue';
            else if (diffHours <= 48 && riskFlag !== 'overdue') riskFlag = 'at_risk';
          }
        });

        progressComputed = totalWeight > 0 ? Number(((completedWeight / totalWeight) * 100).toFixed(2)) : 0;
      }
    }

    // 2. Update goal record
    const { data: updatedGoal, error: uErr } = await supabase
      .from('goals')
      .update({
        progress_computed: progressComputed,
        risk_flag: riskFlag
      })
      .eq('id', goalId)
      .select()
      .single();

    if (uErr) {
      console.error("Error updating goal rollup:", uErr);
      return null;
    }

    return updatedGoal;

  } catch (err) {
    console.error("Goal rollup computation error:", err);
    return null;
  }
}

/**
 * Computes Goal Progress (weighted average across list of goals)
 */
export function calculateGoalsProgress(goalsList = []) {
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
 * Computes Project Effective Progress
 */
export function calculateProjectProgress(goalsList = []) {
  return calculateGoalsProgress(goalsList);
}

/**
 * Computes Department Effective Progress
 */
export function calculateDepartmentProgress(projectsList = []) {
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
 * Productivity score formula
 */
export function calculateProductivityScore(taskList = []) {
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
 * Personal streak counter
 */
export function calculateStreak(taskList = []) {
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
 * Urgency sort priority
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

export function sortTasksByUrgency(taskList = []) {
  return [...(taskList || [])].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));
}
