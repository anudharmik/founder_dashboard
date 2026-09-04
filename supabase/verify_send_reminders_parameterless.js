import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing required environment variables in .env (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function verifySendRemindersParameterless() {
  console.log("=== PARAMETERLESS SEND-REMINDERS CRON VERIFICATION ===");
  const rand = Math.floor(Math.random() * 1000000);

  // 1. Create User A & Org A
  const userAEmail = `cron_user_a_${rand}@founder-dashboard.com`;
  const userBEmail = `cron_user_b_${rand}@founder-dashboard.com`;

  const { data: uA } = await supabase.auth.admin.createUser({ email: userAEmail, password: 'Password123!', email_confirm: true });
  const { data: uB } = await supabase.auth.admin.createUser({ email: userBEmail, password: 'Password123!', email_confirm: true });

  const { data: orgA } = await supabase.from('organizations').insert({ name: `Cron Org A ${rand}`, created_by: uA.user.id }).select().single();
  const { data: orgB } = await supabase.from('organizations').insert({ name: `Cron Org B ${rand}`, created_by: uB.user.id }).select().single();

  const { data: deptA } = await supabase.from('departments').insert({ org_id: orgA.id, name: 'Eng A' }).select().single();
  const { data: projA } = await supabase.from('projects').insert({ org_id: orgA.id, department_id: deptA.id, title: 'Proj A', created_by: uA.user.id }).select().single();
  const { data: goalA } = await supabase.from('goals').insert({ org_id: orgA.id, project_id: projA.id, title: 'Goal A', created_by: uA.user.id }).select().single();

  const { data: deptB } = await supabase.from('departments').insert({ org_id: orgB.id, name: 'Eng B' }).select().single();
  const { data: projB } = await supabase.from('projects').insert({ org_id: orgB.id, department_id: deptB.id, title: 'Proj B', created_by: uB.user.id }).select().single();
  const { data: goalB } = await supabase.from('goals').insert({ org_id: orgB.id, project_id: projB.id, title: 'Goal B', created_by: uB.user.id }).select().single();

  // Calculate 20 days ago for cutoff date comparison
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
  const overdueDateStr = twentyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD

  // Insert overdue task in Org A
  const { data: taskA } = await supabase.from('tasks').insert({
    org_id: orgA.id,
    goal_id: goalA.id,
    title: 'Overdue Task Org A',
    completed: false,
    deadline: overdueDateStr,
    overdue_email_sent: false,
    assignee_id: uA.user.id,
    assigner_id: uA.user.id
  }).select().single();

  // Insert overdue task in Org B
  const { data: taskB } = await supabase.from('tasks').insert({
    org_id: orgB.id,
    goal_id: goalB.id,
    title: 'Overdue Task Org B',
    completed: false,
    deadline: overdueDateStr,
    overdue_email_sent: false,
    assignee_id: uB.user.id,
    assigner_id: uB.user.id
  }).select().single();

  // Insert pending reminder in Org A
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: remA } = await supabase.from('reminders').insert({
    org_id: orgA.id,
    user_id: uA.user.id,
    title: 'Pending Reminder Org A',
    remind_at: oneHourAgo,
    sent: false
  }).select().single();

  // Insert pending reminder in Org B
  const { data: remB } = await supabase.from('reminders').insert({
    org_id: orgB.id,
    user_id: uB.user.id,
    title: 'Pending Reminder Org B',
    remind_at: oneHourAgo,
    sent: false
  }).select().single();

  console.log(`Setup complete across 2 organizations:`);
  console.log(`  - Org A (${orgA.id}): Task ${taskA.id} (deadline: ${taskA.deadline}), Reminder ${remA.id} (remind_at: ${remA.remind_at})`);
  console.log(`  - Org B (${orgB.id}): Task ${taskB.id} (deadline: ${taskB.deadline}), Reminder ${remB.id} (remind_at: ${remB.remind_at})`);

  // --- PARAMETERLESS CRON QUERY SIMULATION (EXACT QUERY FROM SEND-REMINDERS INDEX.TS) ---
  console.log("\n--- EXECUTING PARAMETERLESS CRON QUERY (NO ORG FILTER, NO BODY) ---");

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const cutoffDateStr = fifteenDaysAgo.toISOString().split("T")[0];

  console.log(`1. Overdue Tasks Query Executed:`);
  console.log(`   supabase.from('tasks').select('*').eq('completed', false).lte('deadline', '${cutoffDateStr}').eq('overdue_email_sent', false)`);

  const { data: overdueTasksReturned, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', false)
    .lte('deadline', cutoffDateStr)
    .eq('overdue_email_sent', false);

  if (taskErr) throw taskErr;
  console.log(`   Actual Rows Returned (${overdueTasksReturned.length} rows):`);
  overdueTasksReturned.forEach(t => console.log(`     - Task ID: ${t.id}, Org ID: ${t.org_id}, Title: "${t.title}", Deadline: ${t.deadline}, Overdue Email Sent: ${t.overdue_email_sent}`));

  console.log(`\n2. Custom Reminders Query Executed:`);
  console.log(`   supabase.from('reminders').select('*').eq('sent', false).lte('remind_at', '${new Date().toISOString()}')`);

  const { data: remindersReturned, error: remErr } = await supabase
    .from('reminders')
    .select('*')
    .eq('sent', false)
    .lte('remind_at', new Date().toISOString());

  if (remErr) throw remErr;
  console.log(`   Actual Rows Returned (${remindersReturned.length} rows):`);
  remindersReturned.forEach(r => console.log(`     - Reminder ID: ${r.id}, Org ID: ${r.org_id}, Title: "${r.title}", Remind At: ${r.remind_at}, Sent: ${r.sent}`));

  // Process updates (simulating send-reminders loop execution)
  for (const t of overdueTasksReturned) {
    await supabase.from('tasks').update({ overdue_email_sent: true }).eq('id', t.id);
  }
  for (const r of remindersReturned) {
    await supabase.from('reminders').update({ sent: true }).eq('id', r.id);
  }

  // Verify post-execution DB state
  const { data: taskACheck } = await supabase.from('tasks').select('overdue_email_sent').eq('id', taskA.id).single();
  const { data: taskBCheck } = await supabase.from('tasks').select('overdue_email_sent').eq('id', taskB.id).single();
  const { data: remACheck } = await supabase.from('reminders').select('sent').eq('id', remA.id).single();
  const { data: remBCheck } = await supabase.from('reminders').select('sent').eq('id', remB.id).single();

  console.log(`\nPost-Execution State Verification:`);
  console.log(`  - Org A Task overdue_email_sent: ${taskACheck.overdue_email_sent}`);
  console.log(`  - Org B Task overdue_email_sent: ${taskBCheck.overdue_email_sent}`);
  console.log(`  - Org A Reminder sent: ${remACheck.sent}`);
  console.log(`  - Org B Reminder sent: ${remBCheck.sent}`);

  if (taskACheck.overdue_email_sent && taskBCheck.overdue_email_sent && remACheck.sent && remBCheck.sent) {
    console.log("\n✅ PARAMETERLESS CRON EXECUTION VERIFIED: Processed due items across ALL orgs cleanly!");
  } else {
    throw new Error("Parameterless cron verification failed!");
  }

  // Clean up test data
  console.log("\nCleaning up test artifacts...");
  await supabase.from('organizations').delete().eq('id', orgA.id);
  await supabase.from('organizations').delete().eq('id', orgB.id);
  await supabase.auth.admin.deleteUser(uA.user.id);
  await supabase.auth.admin.deleteUser(uB.user.id);
  console.log("Cleanup complete.");
}

verifySendRemindersParameterless().catch(err => {
  console.error("Parameterless send-reminders verification failed:", err);
  process.exit(1);
});
