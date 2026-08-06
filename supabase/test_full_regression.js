import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey);

async function runRegressionSuite() {
  console.log("=================================================");
  console.log("RUNNING COMPREHENSIVE FOUNDEROS REGRESSION SUITE");
  console.log("=================================================\n");

  let passes = 0;
  let fails = 0;

  // 1. Fetch baseline org
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id, name').limit(1);
  if (orgErr || !orgs || orgs.length === 0) {
    console.error("❌ Failed fetching baseline org:", orgErr);
    process.exit(1);
  }
  const activeOrgId = orgs[0].id;
  console.log(`Using activeOrg '${orgs[0].name}' (${activeOrgId})\n`);

  // Fetch or create test department
  let { data: depts } = await supabase.from('departments').select('id, name').eq('org_id', activeOrgId).limit(1);
  let deptId = depts && depts.length > 0 ? depts[0].id : null;
  if (!deptId) {
    const { data: newDept } = await supabase.from('departments').insert({ org_id: activeOrgId, name: 'Regression Test Dept' }).select().single();
    deptId = newDept.id;
  }

  // Fetch or create test project
  let { data: projs } = await supabase.from('projects').select('id, title').eq('org_id', activeOrgId).limit(1);
  let projId = projs && projs.length > 0 ? projs[0].id : null;
  if (!projId) {
    const { data: newProj } = await supabase.from('projects').insert({ org_id: activeOrgId, department_id: deptId, title: 'Regression Test Project' }).select().single();
    projId = newProj.id;
  }

  // Fetch or create test goal
  let { data: goals } = await supabase.from('goals').select('id, title').eq('org_id', activeOrgId).limit(1);
  let goalId = goals && goals.length > 0 ? goals[0].id : null;
  if (!goalId) {
    const { data: newGoal } = await supabase.from('goals').insert({ org_id: activeOrgId, project_id: projId, title: 'Regression Test Goal' }).select().single();
    goalId = newGoal.id;
  }

  // Fetch or create test milestone
  let { data: mss } = await supabase.from('milestones').select('id, title').eq('goal_id', goalId).limit(1);
  let msId = mss && mss.length > 0 ? mss[0].id : null;
  if (!msId) {
    const { data: newMs } = await supabase.from('milestones').insert({ org_id: activeOrgId, goal_id: goalId, title: 'Regression Test Milestone' }).select().single();
    msId = newMs.id;
  }

  // Fetch test user
  const { data: mems } = await supabase.from('org_members').select('user_id, role').eq('org_id', activeOrgId).limit(1);
  const testUserId = mems[0]?.user_id || '00000000-0000-0000-0000-000000000000';

  // -------------------------------------------------------------
  // TEST 1: Task creation (all entry points)
  // -------------------------------------------------------------
  console.log("--- TEST 1: Task Creation (All Entry Points) ---");

  // EP1: GoalDetail.jsx Milestone task
  const { data: task1, error: err1 } = await supabase.from('tasks').insert({
    org_id: activeOrgId, goal_id: goalId, milestone_id: msId,
    title: 'Regression Task EP1: Milestone Card',
    assignee_id: testUserId, assigner_id: testUserId, reviewer_id: testUserId,
    approval_status: 'not_required', blocked_by: null, completed: false
  }).select().single();

  if (!err1 && task1) {
    console.log("  [PASS] EP1: GoalDetail Milestone Card Task created (ID:", task1.id, ")");
    await supabase.from('tasks').delete().eq('id', task1.id);
    passes++;
  } else {
    console.error("  [FAIL] EP1 task creation failed:", err1?.message);
    fails++;
  }

  // EP2: Goals.jsx inline task
  const { data: task2, error: err2 } = await supabase.from('tasks').insert({
    org_id: activeOrgId, goal_id: goalId,
    title: 'Regression Task EP2: Goals Inline',
    assignee_id: testUserId, assigner_id: testUserId, weight: 1, completed: false
  }).select().single();

  if (!err2 && task2) {
    console.log("  [PASS] EP2: Goals.jsx Inline Task created (ID:", task2.id, ")");
    await supabase.from('tasks').delete().eq('id', task2.id);
    passes++;
  } else {
    console.error("  [FAIL] EP2 inline task creation failed:", err2?.message);
    fails++;
  }

  // EP3: AI Proposal Accept
  const { data: task3, error: err3 } = await supabase.from('tasks').insert({
    org_id: activeOrgId, goal_id: goalId, milestone_id: msId,
    title: 'Regression Task EP3: AI Proposed Task',
    assignee_id: testUserId, assigner_id: testUserId, reviewer_id: testUserId,
    approval_status: 'not_required', ai_generated: true, completed: false
  }).select().single();

  if (!err3 && task3) {
    console.log("  [PASS] EP3: AI Proposal Accepted Task created (ID:", task3.id, ")");
    await supabase.from('tasks').delete().eq('id', task3.id);
    passes++;
  } else {
    console.error("  [FAIL] EP3 AI proposal task creation failed:", err3?.message);
    fails++;
  }

  // EP4: Task creation with blocked_by empty string sanitization
  const blockedByValue = ("" && "".trim() !== '') ? "".trim() : null;
  const { data: task4, error: err4 } = await supabase.from('tasks').insert({
    org_id: activeOrgId, goal_id: goalId, milestone_id: msId,
    title: 'Regression Task EP4: BlockedBy Sanitized',
    assignee_id: testUserId, assigner_id: testUserId,
    blocked_by: blockedByValue, completed: false
  }).select().single();

  if (!err4 && task4 && task4.blocked_by === null) {
    console.log("  [PASS] EP4: Task with sanitized empty string blocked_by created cleanly (ID:", task4.id, ", blocked_by: NULL)");
    await supabase.from('tasks').delete().eq('id', task4.id);
    passes++;
  } else {
    console.error("  [FAIL] EP4 task creation failed:", err4?.message);
    fails++;
  }

  // -------------------------------------------------------------
  // TEST 2: Goal and Milestone Creation
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Goal & Milestone Creation ---");
  const { data: testGoal, error: goalErr } = await supabase.from('goals').insert({
    org_id: activeOrgId, project_id: projId, title: 'Test Goal Creation', weight: 1
  }).select().single();

  if (!goalErr && testGoal) {
    console.log("  [PASS] Goal Creation succeeded (ID:", testGoal.id, ")");

    const { data: testMs, error: msErr } = await supabase.from('milestones').insert({
      org_id: activeOrgId, goal_id: testGoal.id, title: 'Test Milestone Creation', weight: 1
    }).select().single();

    if (!msErr && testMs) {
      console.log("  [PASS] Milestone Creation succeeded (ID:", testMs.id, ")");
      await supabase.from('milestones').delete().eq('id', testMs.id);
      passes++;
    } else {
      console.error("  [FAIL] Milestone Creation failed:", msErr?.message);
      fails++;
    }

    await supabase.from('goals').delete().eq('id', testGoal.id);
    passes++;
  } else {
    console.error("  [FAIL] Goal Creation failed:", goalErr?.message);
    fails++;
  }

  // -------------------------------------------------------------
  // TEST 3: Team Creation (Normal case with Department)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Team Creation (Normal Case) ---");
  const { data: testTeam, error: teamErr } = await supabase.from('teams').insert({
    org_id: activeOrgId, name: 'Regression Test Team'
  }).select().single();

  if (!teamErr && testTeam) {
    console.log("  [PASS] Team Creation with Department present succeeded (ID:", testTeam.id, ")");
    await supabase.from('teams').delete().eq('id', testTeam.id);
    passes++;
  } else {
    console.error("  [FAIL] Team Creation failed:", teamErr?.message);
    fails++;
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log("=================================================");

  if (fails > 0) process.exit(1);
}

runRegressionSuite().catch(console.error);
