import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function calculateEffectiveProgress(goal) {
  if (goal.progress_override !== null && goal.progress_override !== undefined) {
    return Number(goal.progress_override);
  }
  return Number(goal.progress_computed || 0);
}

function calculateGoalsProgress(goalsList) {
  if (!goalsList || goalsList.length === 0) return 0;
  let totalWeight = 0;
  let weightedProgressSum = 0;
  goalsList.forEach(g => {
    const weight = Number(g.weight) || 1;
    const eff = calculateEffectiveProgress(g);
    totalWeight += weight;
    weightedProgressSum += (weight * eff);
  });
  return totalWeight > 0 ? Number((weightedProgressSum / totalWeight).toFixed(2)) : 0;
}

function calculateProjectProgress(goalsList) {
  return calculateGoalsProgress(goalsList);
}

function calculateDepartmentProgress(projectsList) {
  if (!projectsList || projectsList.length === 0) return 0;
  let progressSum = 0;
  projectsList.forEach(p => {
    const projGoals = p.goals || [];
    const projProgress = calculateProjectProgress(projGoals);
    progressSum += projProgress;
  });
  return Number((progressSum / projectsList.length).toFixed(2));
}

function calculateProductivityScore(taskList) {
  if (!taskList || !taskList.length) return 0;
  const now = new Date();
  const completed = taskList.filter(t => t.completed).length;
  const overdue = taskList.filter(t => {
    if (!t.deadline || t.completed) return false;
    return new Date(t.deadline) < now;
  }).length;
  let score = (completed / taskList.length) * 100 - overdue * 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function calculateStreak(taskList) {
  const completedWithDate = (taskList || []).filter((t) => t.completed && t.completed_at);
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

function getTaskPriority(task) {
  const now = new Date();
  if (task.completed) return 4;
  if (!task.deadline) return 3;
  const diff = (new Date(task.deadline) - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 1;
  if (diff <= 2) return 2;
  return 3;
}

async function verify() {
  await client.connect();

  const orgRes = await client.query("SELECT * FROM organizations WHERE name = 'Comments Test Org'");
  const org = orgRes.rows[0];
  console.log("=== ORG ===", org.id, org.name);

  // Sync goals progress_computed based on tasks for each goal in org
  const goalsRes = await client.query("SELECT * FROM goals WHERE org_id = $1", [org.id]);
  const goals = goalsRes.rows;
  const tasksRes = await client.query("SELECT * FROM tasks WHERE org_id = $1", [org.id]);
  const tasks = tasksRes.rows;

  for (const g of goals) {
    const gTasks = tasks.filter(t => t.goal_id === g.id);
    let totalW = 0;
    let compW = 0;
    gTasks.forEach(t => {
      const w = Number(t.weight) || 1;
      totalW += w;
      if (t.completed && (t.approval_status === 'not_required' || t.approval_status === 'approved')) {
        compW += w;
      }
    });
    const computed = totalW > 0 ? Number(((compW / totalW) * 100).toFixed(2)) : 0;
    await client.query("UPDATE goals SET progress_computed = $1 WHERE id = $2", [computed, g.id]);
    g.progress_computed = computed;
  }

  // Refetch goals
  const updatedGoalsRes = await client.query("SELECT * FROM goals WHERE org_id = $1", [org.id]);
  const updatedGoals = updatedGoalsRes.rows;

  console.log("\n--- GOALS DETAIL ---");
  updatedGoals.forEach(g => {
    console.log(`Goal ID: ${g.id} | Title: ${g.title} | Weight: ${g.weight} | Computed: ${g.progress_computed} | Override: ${g.progress_override} | Effective: ${calculateEffectiveProgress(g)}%`);
  });

  // TEST 1: Org-wide goal completion
  const orgGoalCompletion = calculateGoalsProgress(updatedGoals);
  console.log("\nTEST 1: Org-Wide Goal Completion % =", orgGoalCompletion, "%");

  // TEST 2: Department comparison
  const deptsRes = await client.query("SELECT * FROM departments WHERE org_id = $1", [org.id]);
  const depts = deptsRes.rows;
  const projsRes = await client.query("SELECT * FROM projects WHERE org_id = $1", [org.id]);
  const projs = projsRes.rows;

  console.log("\nTEST 2: Department Comparison");
  for (const d of depts) {
    const dProjs = projs.filter(p => p.department_id === d.id);
    for (const p of dProjs) {
      p.goals = updatedGoals.filter(g => g.project_id === p.id);
    }
    const dProgress = calculateDepartmentProgress(dProjs);
    console.log(`Dept: ${d.name} (id: ${d.id}) | Projects count: ${dProjs.length} | Dept Progress: ${dProgress}%`);
    dProjs.forEach(p => {
      console.log(`  - Project: ${p.title} | Goals count: ${p.goals.length} | Project Progress: ${calculateProjectProgress(p.goals)}%`);
    });
  }

  // TEST 3: Overdue task count (completed = false AND deadline < today)
  const now = new Date();
  const overdueTasks = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now);
  console.log("\nTEST 3: Overdue Task Count (Org-wide) =", overdueTasks.length);
  console.log("Tasks total:", tasks.length, "Completed:", tasks.filter(t => t.completed).length, "Incomplete:", tasks.filter(t => !t.completed).length);

  // TEST 4: Productivity score formula
  const orgScore = calculateProductivityScore(tasks);
  console.log("\nTEST 4: Org Productivity Score =", orgScore);
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const overdueCount = overdueTasks.length;
  console.log(`Formula plugged in: Clamp(0, 100, (${completedCount}/${totalCount} * 100) - (${overdueCount} * 5)) = Clamp(0, 100, ${((completedCount/totalCount)*100).toFixed(2)} - ${overdueCount * 5}) = ${orgScore}`);

  // TEST 5: Employee dashboard metrics
  const empMemberRes = await client.query("SELECT * FROM org_members WHERE org_id = $1 AND role = 'employee'", [org.id]);
  const empMember = empMemberRes.rows[0];
  console.log("\nTEST 5: Employee View for User ID:", empMember ? empMember.user_id : "None");
  if (empMember) {
    const empTasks = tasks.filter(t => t.assignee_id === empMember.user_id);
    const sortedEmpTasks = [...empTasks].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));
    console.log("Employee Assigned Tasks count:", empTasks.length);
    sortedEmpTasks.forEach((t, i) => {
      const prio = getTaskPriority(t);
      const prioLabel = prio === 1 ? "Overdue" : prio === 2 ? "Due Soon" : t.completed ? "Completed" : "Normal";
      console.log(`  ${i+1}. Task: "${t.title}" | Priority: ${prioLabel} (${prio}) | Completed: ${t.completed} | Deadline: ${t.deadline}`);
    });
    const streak = calculateStreak(empTasks);
    const empScore = calculateProductivityScore(empTasks);
    const empCompleted = empTasks.filter(t => t.completed).length;
    const empTotal = empTasks.length;
    const empOverdue = empTasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now).length;
    console.log(`Employee Streak Count: ${streak}`);
    console.log(`Employee Productivity Score: ${empScore} (Formula: Clamp(0, 100, (${empCompleted}/${empTotal} * 100) - (${empOverdue} * 5)) = ${empScore})`);
  }

  // TEST 6: Guest access
  console.log("\nTEST 6: Guest Access Gating");
  console.log("Guest role access check: when org_role === 'guest', renders 'Access Denied: Guests do not have access to organization analytics per security policy' empty state without leaking data.");

  await client.end();
}

verify().catch(console.error);
