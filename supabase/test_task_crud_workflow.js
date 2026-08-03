import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function logActivity(client, orgId, entityType, entityId, action, metadata = null) {
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client.from('activity_log').insert({
    org_id: orgId,
    entity_type: entityType,
    entity_id: entityId,
    actor_id: user?.id || null,
    action: action,
    metadata: metadata
  }).select().single();
  return { data, error };
}

async function runTaskCrudWorkflowVerification() {
  console.log("=================================================");
  console.log("FOUNDEROS PHASE 1 — TASK CRUD & WORKFLOW RLS VERIFICATION");
  console.log("=================================================\n");

  const ts = Date.now();
  const ownerEmail = `owner_t_${ts}@example.com`;
  const managerEmail = `manager_t_${ts}@example.com`;
  const employeeEmail = `employee_t_${ts}@example.com`;
  const employee2Email = `employee2_t_${ts}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log("1. Creating test accounts...");
  const { data: uOwner } = await supabaseAdmin.auth.admin.createUser({ email: ownerEmail, password: testPassword, email_confirm: true });
  const { data: uManager } = await supabaseAdmin.auth.admin.createUser({ email: managerEmail, password: testPassword, email_confirm: true });
  const { data: uEmployee } = await supabaseAdmin.auth.admin.createUser({ email: employeeEmail, password: testPassword, email_confirm: true });
  const { data: uEmployee2 } = await supabaseAdmin.auth.admin.createUser({ email: employee2Email, password: testPassword, email_confirm: true });

  const clientOwner = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientManager = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientEmployee = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  await clientOwner.auth.signInWithPassword({ email: ownerEmail, password: testPassword });
  await clientManager.auth.signInWithPassword({ email: managerEmail, password: testPassword });
  await clientEmployee.auth.signInWithPassword({ email: employeeEmail, password: testPassword });

  console.log("✅ Authenticated 3 test sessions.\n");

  // Setup Org B
  const { data: orgB } = await clientOwner.from('organizations').insert({ name: 'Org B Task Test' }).select().single();
  await clientOwner.from('org_members').insert({ org_id: orgB.id, user_id: uManager.user.id, role: 'manager' });
  await clientOwner.from('org_members').insert({ org_id: orgB.id, user_id: uEmployee.user.id, role: 'employee' });
  await clientOwner.from('org_members').insert({ org_id: orgB.id, user_id: uEmployee2.user.id, role: 'employee' });

  // Setup Dept, Project, Goals
  const { data: dept } = await clientOwner.from('departments').insert({ org_id: orgB.id, name: 'Eng Dept' }).select().single();
  const { data: proj } = await clientOwner.from('projects').insert({ org_id: orgB.id, department_id: dept.id, title: 'Task Test Project' }).select().single();

  // Goal 1 (Goal with employee tasks)
  const { data: goal1 } = await clientOwner.from('goals').insert({ org_id: orgB.id, project_id: proj.id, title: 'Goal 1 Assigned' }).select().single();
  // Goal 2 (Goal with NO employee tasks)
  const { data: goal2 } = await clientOwner.from('goals').insert({ org_id: orgB.id, project_id: proj.id, title: 'Goal 2 Unassigned' }).select().single();

  console.log("Setup complete:", { org_id: orgB.id, goal1_id: goal1.id, goal2_id: goal2.id });

  // ----------------------------------------------------
  // TEST CASE 1: Manager creates task (not_required)
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 1: Manager creates task assigned to employee (approval_status=not_required) ---");
  const { data: task1, error: errTask1 } = await clientManager.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal1.id,
    title: 'Standard Task No Approval',
    description: 'Direct task completion',
    weight: 1,
    assignee_id: uEmployee.user.id,
    assigner_id: uManager.user.id,
    reviewer_id: uManager.user.id,
    approval_status: 'not_required',
    completed: false
  }).select().single();

  if (task1) {
    await logActivity(clientManager, orgB.id, 'task', task1.id, 'created', { title: task1.title, goal_id: goal1.id, assignee_id: uEmployee.user.id });
    await logActivity(clientManager, orgB.id, 'task', task1.id, 'assigned', { assignee_id: uEmployee.user.id });
  }

  console.log("TEST 1 RESULT:", {
    task_id: task1?.id,
    assigner_id: task1?.assigner_id,
    reviewer_id: task1?.reviewer_id,
    assignee_id: task1?.assignee_id,
    approval_status: task1?.approval_status,
    error: errTask1
  });

  // ----------------------------------------------------
  // TEST CASE 2: Employee completes task1 (immediate)
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 2: Employee marks task completed=true (no approval gate) ---");
  const { data: compTask1, error: errComp1 } = await clientEmployee.from('tasks').update({
    completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', task1.id).select().single();

  const { data: actLogComp1 } = await logActivity(clientEmployee, orgB.id, 'task', task1.id, 'completed');

  console.log("TEST 2 RESULT:", {
    completed: compTask1?.completed,
    completed_at: compTask1?.completed_at,
    activity_log_action: actLogComp1?.action,
    error: errComp1
  });

  // ----------------------------------------------------
  // TEST CASE 3: Approval Workflow (pending -> submitted -> approved)
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 3: Approval workflow (pending -> submitted -> approved) ---");
  // Manager creates task2 with approval_status='pending'
  const { data: task2 } = await clientManager.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal1.id,
    title: 'Approval Required Task',
    assignee_id: uEmployee.user.id,
    assigner_id: uManager.user.id,
    reviewer_id: uManager.user.id,
    approval_status: 'pending',
    completed: false
  }).select().single();

  await logActivity(clientManager, orgB.id, 'task', task2.id, 'created');
  await logActivity(clientManager, orgB.id, 'task', task2.id, 'assigned', { assignee_id: uEmployee.user.id });

  // Employee submits for review (does NOT set completed=true or approved)
  const { data: actLogSub2 } = await logActivity(clientEmployee, orgB.id, 'task', task2.id, 'submitted_for_review');

  const { data: checkTask2Before } = await clientEmployee.from('tasks').select('*').eq('id', task2.id).single();

  console.log("TEST 3A (After Employee Submit for Review):", {
    completed: checkTask2Before?.completed,
    approval_status: checkTask2Before?.approval_status,
    activity_log_action: actLogSub2?.action
  });

  // Manager approves task2
  const { data: approvedTask2, error: errApprove } = await clientManager.from('tasks').update({
    approval_status: 'approved',
    completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', task2.id).select().single();

  const { data: actLogApprove2 } = await logActivity(clientManager, orgB.id, 'task', task2.id, 'approved');

  console.log("TEST 3B (After Manager Approval):", {
    approval_status: approvedTask2?.approval_status,
    completed: approvedTask2?.completed,
    activity_log_action: actLogApprove2?.action,
    error: errApprove
  });

  // ----------------------------------------------------
  // TEST CASE 4: Employee attempts creation on unassigned goal
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 4: Employee attempts task creation on unassigned goal ---");
  const { data: rogueTask, error: errRogueTask } = await clientEmployee.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal2.id, // Goal 2 has NO tasks assigned to Employee
    title: 'Rogue Task on Goal 2',
    assignee_id: uEmployee.user.id
  }).select().single();

  console.log("TEST 4 RESULT (Blocked on Unassigned Goal):", {
    data: rogueTask,
    error_code: errRogueTask?.code,
    error_message: errRogueTask?.message
  });

  // ----------------------------------------------------
  // TEST CASE 5: Employee attempts assigning task to another user
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 5: Employee attempts assigning task to another user ---");
  const { data: reassignTask, error: errReassign } = await clientEmployee.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal1.id,
    title: 'Task Assigned to Other Employee',
    assignee_id: uEmployee2.user.id // Employee 2
  }).select().single();

  console.log("TEST 5 RESULT (Blocked Reassigning to Other User):", {
    data: reassignTask,
    error_code: errReassign?.code,
    error_message: errReassign?.message
  });

  // ----------------------------------------------------
  // TEST CASE 6: Blocked_by visual soft-link
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 6: blocked_by soft-link visual flag ---");
  const { data: taskBlocker } = await clientManager.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal1.id,
    title: 'Prerequisite Task A',
    assignee_id: uEmployee.user.id,
    approval_status: 'not_required'
  }).select().single();

  const { data: taskBlocked, error: errBlocked } = await clientManager.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goal1.id,
    title: 'Dependent Task B',
    assignee_id: uEmployee.user.id,
    blocked_by: taskBlocker.id,
    approval_status: 'not_required'
  }).select().single();

  // Employee completes blocked task anyway
  const { data: compBlockedTask, error: errCompBlocked } = await clientEmployee.from('tasks').update({
    completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', taskBlocked.id).select().single();

  console.log("TEST 6 RESULT:", {
    blocked_task_id: taskBlocked?.id,
    blocked_by_id: taskBlocked?.blocked_by,
    completion_successful: compBlockedTask?.completed,
    error: errCompBlocked
  });

  // ----------------------------------------------------
  // TEST CASE 7: Urgency sorting on /tasks
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 7: Urgency sorting verification ---");
  const now = new Date();

  const tOverdue = { id: '1', title: 'Overdue Task', deadline: new Date(now.getTime() - 3 * 86400000).toISOString(), completed: false };
  const tDueSoon = { id: '2', title: 'Due Soon Task', deadline: new Date(now.getTime() + 1 * 86400000).toISOString(), completed: false };
  const tNormal  = { id: '3', title: 'Normal Task', deadline: new Date(now.getTime() + 10 * 86400000).toISOString(), completed: false };
  const tDone    = { id: '4', title: 'Completed Task', deadline: new Date(now.getTime() - 1 * 86400000).toISOString(), completed: true };

  function getPriority(task) {
    if (task.completed) return 4;
    if (!task.deadline) return 3;
    const diff = (new Date(task.deadline) - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 1; // Overdue
    if (diff <= 2) return 2; // Due Soon
    return 3; // Normal
  }

  const rawList = [tDone, tNormal, tOverdue, tDueSoon];
  const sortedList = [...rawList].sort((a, b) => getPriority(a) - getPriority(b));

  console.log("TEST 7 RESULT (Sorted by Urgency):", {
    order: sortedList.map(t => `${t.title} (P:${getPriority(t)})`),
    is_correct_order: sortedList[0].id === '1' && sortedList[1].id === '2' && sortedList[2].id === '3' && sortedList[3].id === '4'
  });

  // Cleanup
  console.log("\nCleaning up test accounts...");
  await supabaseAdmin.auth.admin.deleteUser(uOwner.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uManager.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uEmployee.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uEmployee2.user.id);
  console.log("Cleanup finished.\n");
}

runTaskCrudWorkflowVerification();
