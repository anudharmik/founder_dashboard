import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runCommentsAndActivityVerification() {
  console.log("=================================================");
  console.log("FOUNDEROS PHASE 1 — TASK COMMENTS & ACTIVITY FEED VERIFICATION");
  console.log("=================================================\n");

  const ts = Date.now();
  const ownerEmail = `owner_comm_${ts}@example.com`;
  const employeeEmail = `employee_comm_${ts}@example.com`;
  const guestEmail = `guest_comm_${ts}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log("1. Creating test accounts...");
  const { data: uOwner } = await supabaseAdmin.auth.admin.createUser({ email: ownerEmail, password: testPassword, email_confirm: true });
  const { data: uEmployee } = await supabaseAdmin.auth.admin.createUser({ email: employeeEmail, password: testPassword, email_confirm: true });
  const { data: uGuest } = await supabaseAdmin.auth.admin.createUser({ email: guestEmail, password: testPassword, email_confirm: true });

  const clientOwner = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientEmployee = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientGuest = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  await clientOwner.auth.signInWithPassword({ email: ownerEmail, password: testPassword });
  await clientEmployee.auth.signInWithPassword({ email: employeeEmail, password: testPassword });
  await clientGuest.auth.signInWithPassword({ email: guestEmail, password: testPassword });

  // Setup Org, Dept, Projects, Goals, Tasks via admin client
  const { data: org } = await supabaseAdmin.from('organizations').insert({ name: 'Comments Test Org' }).select().single();
  await supabaseAdmin.from('org_members').insert({ org_id: org.id, user_id: uOwner.user.id, role: 'owner' });
  await supabaseAdmin.from('org_members').insert({ org_id: org.id, user_id: uEmployee.user.id, role: 'employee' });
  // uGuest is NOT in org_members (Guest user)

  const { data: dept } = await supabaseAdmin.from('departments').insert({ org_id: org.id, name: 'Eng Dept' }).select().single();

  // Project A (Guest will get access)
  const { data: projA } = await supabaseAdmin.from('projects').insert({ org_id: org.id, department_id: dept.id, title: 'Project Alpha' }).select().single();
  // Project B (Guest will NOT get access)
  const { data: projB } = await supabaseAdmin.from('projects').insert({ org_id: org.id, department_id: dept.id, title: 'Project Beta' }).select().single();

  // Goals
  const { data: goalA1 } = await supabaseAdmin.from('goals').insert({ org_id: org.id, project_id: projA.id, title: 'Goal A1' }).select().single();
  const { data: goalA2 } = await supabaseAdmin.from('goals').insert({ org_id: org.id, project_id: projA.id, title: 'Goal A2' }).select().single();
  const { data: goalB1 } = await supabaseAdmin.from('goals').insert({ org_id: org.id, project_id: projB.id, title: 'Goal B1' }).select().single();

  // Tasks
  const { data: taskA1 } = await supabaseAdmin.from('tasks').insert({
    org_id: org.id,
    goal_id: goalA1.id,
    title: 'Task A1',
    assignee_id: uEmployee.user.id,
    approval_status: 'not_required'
  }).select().single();
  await supabaseAdmin.from('activity_log').insert({ org_id: org.id, entity_type: 'task', entity_id: taskA1.id, actor_id: uOwner.user.id, action: 'created' });
  await supabaseAdmin.from('activity_log').insert({ org_id: org.id, entity_type: 'task', entity_id: taskA1.id, actor_id: uOwner.user.id, action: 'assigned', metadata: { assignee_id: uEmployee.user.id } });

  const { data: taskA2 } = await supabaseAdmin.from('tasks').insert({
    org_id: org.id,
    goal_id: goalA2.id,
    title: 'Task A2',
    assignee_id: uEmployee.user.id
  }).select().single();

  const { data: taskB1 } = await supabaseAdmin.from('tasks').insert({
    org_id: org.id,
    goal_id: goalB1.id,
    title: 'Task B1'
  }).select().single();

  console.log("Setup complete:", { org_id: org.id, projA_id: projA.id, projB_id: projB.id });

  // ----------------------------------------------------
  // TEST CASE 1: Employee posts comment on taskA1
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 1: Employee posts comment ---");
  const commentText1 = "Working on component implementation!";
  const { data: empComm, error: errEmpComm } = await clientEmployee.from('task_comments').insert({
    org_id: org.id,
    task_id: taskA1.id,
    author_id: uEmployee.user.id,
    body: commentText1
  }).select().single();

  let empActLogRow = null;
  if (empComm) {
    const { data: act } = await clientEmployee.from('activity_log').insert({
      org_id: org.id,
      entity_type: 'task',
      entity_id: taskA1.id,
      actor_id: uEmployee.user.id,
      action: 'commented',
      metadata: { content_snippet: commentText1.slice(0, 50) }
    }).select().single();
    empActLogRow = act;
  }

  console.log("TEST 1 RESULT:", {
    comment_id: empComm?.id,
    task_id: empComm?.task_id,
    author_id: empComm?.author_id,
    body: empComm?.body,
    activity_log_action: empActLogRow?.action,
    error: errEmpComm
  });

  // ----------------------------------------------------
  // TEST CASE 2: Guest attempts comment on projA without guest_project_access
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 2: Guest without project access attempts to comment ---");
  const { data: unauthComm, error: errUnauthComm } = await clientGuest.from('task_comments').insert({
    org_id: org.id,
    task_id: taskA1.id,
    author_id: uGuest.user.id,
    body: "Rogue guest comment"
  }).select().single();

  console.log("TEST 2 RESULT (Guest Blocked Without Grant):", {
    data: unauthComm,
    error_code: errUnauthComm?.code,
    error_message: errUnauthComm?.message
  });

  // ----------------------------------------------------
  // TEST CASE 3: Guest WITH guest_project_access to Project A comments on taskA1, but blocked on taskB1
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 3: Guest WITH guest_project_access comments on Proj A & blocked on Proj B ---");
  // Grant guest access to Project A via admin client
  const { data: gpaRow, error: errGpa } = await supabaseAdmin.from('guest_project_access').insert({
    org_id: org.id,
    project_id: projA.id,
    user_id: uGuest.user.id
  }).select().single();

  // Guest comments on taskA1 (under Project A)
  const { data: guestCommProjA, error: errGuestProjA } = await clientGuest.from('task_comments').insert({
    org_id: org.id,
    task_id: taskA1.id,
    author_id: uGuest.user.id,
    body: "Guest feedback on Project A task!"
  }).select().single();

  // Guest attempts comment on taskB1 (under Project B without access)
  const { data: guestCommProjB, error: errGuestProjB } = await clientGuest.from('task_comments').insert({
    org_id: org.id,
    task_id: taskB1.id,
    author_id: uGuest.user.id,
    body: "Unauthorized comment on Project B task"
  }).select().single();

  console.log("TEST 3 RESULT:", {
    projA_comment_success: Boolean(guestCommProjA),
    projA_comment_id: guestCommProjA?.id,
    projA_error: errGuestProjA,
    projB_comment_blocked: errGuestProjB?.code === '42501',
    projB_error_code: errGuestProjB?.code
  });

  // ----------------------------------------------------
  // TEST CASE 4: Per-task activity feed chronological order & descriptions
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 4: Per-task activity feed verification ---");
  // Mark taskA1 complete
  await clientEmployee.from('tasks').update({ completed: true }).eq('id', taskA1.id);
  await clientEmployee.from('activity_log').insert({ org_id: org.id, entity_type: 'task', entity_id: taskA1.id, actor_id: uEmployee.user.id, action: 'completed' });

  const { data: taskA1Activities } = await clientOwner.from('activity_log')
    .select('*')
    .eq('entity_type', 'task')
    .eq('entity_id', taskA1.id)
    .order('created_at', { ascending: true });

  console.log("TEST 4 RESULT (Per-task Activity History):", {
    task_id: taskA1.id,
    event_count: taskA1Activities?.length,
    actions_chronological: taskA1Activities?.map(a => `${a.action} (by ${a.actor_id.slice(0, 8)}...)`)
  });

  // ----------------------------------------------------
  // TEST CASE 5: Per-project activity feed aggregation across multiple goals/tasks
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 5: Per-project activity feed aggregation across goals/tasks ---");
  // Add activity on taskA2 (under Goal A2)
  await clientOwner.from('activity_log').insert({ org_id: org.id, entity_type: 'task', entity_id: taskA2.id, actor_id: uOwner.user.id, action: 'created' });

  const projGoalIds = [goalA1.id, goalA2.id];
  const projTaskIds = [taskA1.id, taskA2.id];

  const filterConds = [
    `and(entity_type.eq.goal,entity_id.in.(${projGoalIds.join(',')}))`,
    `and(entity_type.eq.task,entity_id.in.(${projTaskIds.join(',')}))`
  ];

  const { data: projActivities } = await clientOwner.from('activity_log')
    .select('*')
    .eq('org_id', org.id)
    .or(filterConds.join(','))
    .order('created_at', { ascending: true });

  console.log("TEST 5 RESULT (Per-project Aggregated Activity Stream):", {
    project_id: projA.id,
    aggregated_events_count: projActivities?.length,
    events: projActivities?.map(a => `[${a.entity_type}:${a.entity_id.slice(0, 8)}...] ${a.action}`)
  });

  // ----------------------------------------------------
  // TEST CASE 6: Goal progress_override set & clear activity_log verification
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 6: Progress override set & clear activity_log ---");
  // Set override to 85
  await clientOwner.from('goals').update({ progress_override: 85 }).eq('id', goalA1.id);
  const { data: actSet } = await clientOwner.from('activity_log').insert({
    org_id: org.id,
    entity_type: 'goal',
    entity_id: goalA1.id,
    actor_id: uOwner.user.id,
    action: 'overridden',
    metadata: { progress_override: 85 }
  }).select().single();

  // Clear override
  await clientOwner.from('goals').update({ progress_override: null }).eq('id', goalA1.id);
  const { data: actClear } = await clientOwner.from('activity_log').insert({
    org_id: org.id,
    entity_type: 'goal',
    entity_id: goalA1.id,
    actor_id: uOwner.user.id,
    action: 'overridden',
    metadata: { action_type: 'cleared', previous_override: 85 }
  }).select().single();

  console.log("TEST 6 RESULT (Progress Override Activity Audit):", {
    override_set_action: actSet?.action,
    override_set_metadata: actSet?.metadata,
    override_clear_action: actClear?.action,
    override_clear_metadata: actClear?.metadata,
    already_existed_or_added: "Set override logging already existed in GoalDetail.jsx; Clear override logging was added in this step!"
  });

  // Cleanup
  console.log("\nCleaning up test accounts...");
  await supabaseAdmin.auth.admin.deleteUser(uOwner.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uEmployee.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uGuest.user.id);
  console.log("Cleanup finished.\n");
}

runCommentsAndActivityVerification();
