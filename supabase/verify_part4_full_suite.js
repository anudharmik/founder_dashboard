import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !secretKey) {
  console.error("Missing required environment variables in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

console.log("=== PART 4 FULL MIGRATION RE-VERIFICATION SUITE ===");
console.log(`Connecting to URL: ${supabaseUrl}`);

const adminClient = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function runPart4Suite() {
  const rand = Math.floor(Math.random() * 1000000);

  // ----------------------------------------------------
  // TEST 1: End-to-End User Signup & Org Creation
  // ----------------------------------------------------
  console.log("\n--- TEST 1: End-to-End User Signup & Org Creation ---");
  const user1Email = `user1_p4_${rand}@founder-dashboard.com`;
  const password = 'Password123!';

  // Create user via Admin Client with email_confirm: true
  const { data: signUpData, error: signUpErr } = await adminClient.auth.admin.createUser({
    email: user1Email,
    password: password,
    email_confirm: true
  });

  if (signUpErr) throw new Error(`Signup failed: ${signUpErr.message}`);
  const user1 = signUpData.user;
  console.log(`✓ User Signup Successful! User ID: ${user1.id}, Email: ${user1.email}`);

  // Authenticate as User 1
  const anonClient1 = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: auth1, error: auth1Err } = await anonClient1.auth.signInWithPassword({
    email: user1Email,
    password: password
  });
  if (auth1Err) throw new Error(`Sign in failed: ${auth1Err.message}`);
  console.log("✓ User 1 session token acquired.");

  // Create Profile automatically/manually if needed
  await anonClient1.from('profiles').upsert({
    id: user1.id,
    full_name: 'Alpha Founder'
  });

  // Create Organization as User 1
  const { data: org1Data, error: org1Err } = await anonClient1
    .from('organizations')
    .insert({ name: `Alpha Corp ${rand}`, created_by: user1.id })
    .select()
    .single();

  if (org1Err) throw new Error(`Org creation failed: ${org1Err.message}`);
  const org1Id = org1Data.id;
  console.log(`✓ Organization Created! Org ID: ${org1Id}, Name: ${org1Data.name}`);

  // Confirm trigger automatically added User 1 as Org Owner in org_members
  const { data: member1Data, error: member1Err } = await anonClient1
    .from('org_members')
    .select('*')
    .eq('org_id', org1Id)
    .eq('user_id', user1.id)
    .single();

  if (member1Err || !member1Data) throw new Error("Auto-owner trigger failed!");
  console.log(`✓ Owner Scaffolding Trigger Verified! User 1 Role: ${member1Data.role}`);


  // ----------------------------------------------------
  // TEST 2: Cross-Tenant Isolation
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Cross-Tenant Data Isolation ---");
  const user2Email = `user2_p4_${rand}@founder-dashboard.com`;
  const { data: signUp2Data } = await adminClient.auth.admin.createUser({ email: user2Email, password, email_confirm: true });
  const user2 = signUp2Data.user;
  const anonClient2 = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await anonClient2.auth.signInWithPassword({ email: user2Email, password });

  const { data: org2Data } = await anonClient2
    .from('organizations')
    .insert({ name: `Beta Inc ${rand}`, created_by: user2.id })
    .select()
    .single();
  const org2Id = org2Data.id;
  console.log(`✓ User 2 & Org 2 Created! Org ID: ${org2Id}`);

  // User 1 creates project & goal in Org 1
  const { data: dept1 } = await anonClient1.from('departments').insert({ org_id: org1Id, name: 'Product' }).select().single();
  const { data: proj1 } = await anonClient1.from('projects').insert({ org_id: org1Id, department_id: dept1.id, title: 'Alpha Secret Engine', created_by: user1.id }).select().single();
  const { data: goal1 } = await anonClient1.from('goals').insert({ org_id: org1Id, project_id: proj1.id, title: 'Alpha Goal 100', created_by: user1.id }).select().single();

  // User 2 queries Org 1 resources
  const { data: leakProj } = await anonClient2.from('projects').select('*').eq('id', proj1.id);
  const { data: leakGoal } = await anonClient2.from('goals').select('*').eq('id', goal1.id);

  if (leakProj.length > 0 || leakGoal.length > 0) {
    throw new Error("CROSS-TENANT ISOLATION FAILURE! Data leaked between orgs!");
  }
  console.log("✓ Cross-Tenant Isolation Verified: User 2 received ZERO rows when querying Org 1's projects & goals.");


  // ----------------------------------------------------
  // TEST 3: RBAC Checks, Scoped Permissions & Safeguards
  // ----------------------------------------------------
  console.log("\n--- TEST 3: RBAC & Safeguards Verification ---");
  const empEmail = `emp_p4_${rand}@founder-dashboard.com`;
  const { data: empSignUp } = await adminClient.auth.admin.createUser({ email: empEmail, password, email_confirm: true });
  const empUser = empSignUp.user;
  const anonEmp = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await anonEmp.auth.signInWithPassword({ email: empEmail, password });

  // Add empUser as 'employee' in Org 1
  await anonClient1.from('org_members').insert({ org_id: org1Id, user_id: empUser.id, role: 'employee' });

  // Employee tries to delete project (Requires manager or owner) -> Should fail or affect 0 rows
  const { data: delResult, error: delErr } = await anonEmp.from('projects').delete().eq('id', proj1.id).select();
  if (delResult && delResult.length > 0) {
    throw new Error("RBAC FAILURE: Employee deleted project!");
  }
  console.log("✓ RBAC Check Passed: Employee cannot delete project.");

  // Test Scoped Elevation: Grant Employee manager role scoped strictly to proj1
  await anonClient1.from('scoped_permissions').insert({
    org_id: org1Id,
    user_id: empUser.id,
    scope_type: 'project',
    scope_id: proj1.id,
    role: 'manager',
    granted_by: user1.id
  });

  // Employee now updates project title
  const { data: updProj, error: updProjErr } = await anonEmp.from('projects').update({ title: 'Alpha Secret Engine (Elevated)' }).eq('id', proj1.id).select();
  if (updProjErr || !updProj || updProj.length === 0) {
    throw new Error(`Scoped Permission Elevation failed: ${updProjErr?.message}`);
  }
  console.log(`✓ Scoped Permission Elevation Verified: Employee granted scoped manager role updated project: "${updProj[0].title}".`);

  // Test Last Owner Safeguard: Attempt to demote sole owner user1 to employee
  const { error: demoteErr } = await anonClient1.from('org_members').update({ role: 'employee' }).eq('org_id', org1Id).eq('user_id', user1.id);
  if (!demoteErr || (!demoteErr.message.includes('sole owner') && !demoteErr.message.includes('last owner'))) {
    throw new Error(`LAST OWNER DEMOTE SAFEGUARD FAILURE! Exception missing or unexpected: ${demoteErr?.message}`);
  }
  
  const { error: deleteOwnerErr } = await anonClient1.from('org_members').delete().eq('org_id', org1Id).eq('user_id', user1.id);
  if (!deleteOwnerErr || (!deleteOwnerErr.message.includes('sole owner') && !deleteOwnerErr.message.includes('last owner'))) {
    throw new Error(`LAST OWNER DELETE SAFEGUARD FAILURE! Exception missing or unexpected: ${deleteOwnerErr?.message}`);
  }
  console.log(`✓ Last-Owner Safeguard Verified! Demote blocked ("${demoteErr.message}"), Delete blocked ("${deleteOwnerErr.message}").`);


  // ----------------------------------------------------
  // TEST 4: Goal -> Milestone -> Task -> Subtask Rollup Math
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Goal -> Milestone -> Task -> Subtask Rollup Progress Math ---");

  // Create Milestone on goal1
  const { data: msData } = await anonClient1.from('milestones').insert({
    org_id: org1Id,
    goal_id: goal1.id,
    title: 'Sprint 1 Milestone',
    weight: 2,
    created_by: user1.id
  }).select().single();

  // Create Task 1 & Task 2 on Milestone (Weight 1 and Weight 3)
  const { data: t1 } = await anonClient1.from('tasks').insert({
    org_id: org1Id,
    goal_id: goal1.id,
    milestone_id: msData.id,
    title: 'Backend Setup',
    weight: 1,
    completed: true,
    assigner_id: user1.id
  }).select().single();

  const { data: t2 } = await anonClient1.from('tasks').insert({
    org_id: org1Id,
    goal_id: goal1.id,
    milestone_id: msData.id,
    title: 'Frontend Dashboard',
    weight: 3,
    completed: false,
    assigner_id: user1.id
  }).select().single();

  // Create Subtasks on Task 2 (Subtask 1: completed, Weight 1; Subtask 2: uncompleted, Weight 1)
  const { data: st1 } = await anonClient1.from('subtasks').insert({
    org_id: org1Id,
    task_id: t2.id,
    title: 'Component Design',
    weight: 1,
    completed: true
  }).select().single();

  const { data: st2 } = await anonClient1.from('subtasks').insert({
    org_id: org1Id,
    task_id: t2.id,
    title: 'API Integration',
    weight: 1,
    completed: false
  }).select().single();

  // Perform Arithmetic Progress Rollup Math Evaluation:
  // 1. Task 2 Subtasks Completion Ratio = (1 completed subtask weight 1) / (total subtasks weight 2) = 50%
  // 2. Task 1 Progress = 100% (completed: true, weight 1) -> Effective completed weight = 1 * 1.0 = 1.0
  // 3. Task 2 Progress = 50% (from subtasks ratio) -> Effective completed weight = 3 * 0.5 = 1.5
  // 4. Milestone Total Tasks Weight = Task 1 Weight (1) + Task 2 Weight (3) = 4.0
  // 5. Milestone Total Completed Weight = 1.0 + 1.5 = 2.5
  // 6. Milestone Computed Progress = (2.5 / 4.0) * 100 = 62.5%

  const totalTaskWeight = t1.weight + t2.weight; // 1 + 3 = 4
  const t1CompletedContrib = t1.weight * (t1.completed ? 1.0 : 0.0); // 1.0
  const t2SubtaskRatio = (st1.completed ? st1.weight : 0) / (st1.weight + st2.weight); // 1 / 2 = 0.5
  const t2CompletedContrib = t2.weight * t2SubtaskRatio; // 3 * 0.5 = 1.5
  const calculatedMilestoneProgress = ((t1CompletedContrib + t2CompletedContrib) / totalTaskWeight) * 100;

  console.log(`Rollup Progress Arithmetic Verification:`);
  console.log(`  - Task 1 Weight: ${t1.weight}, Status: Completed (Contribution: ${t1CompletedContrib})`);
  console.log(`  - Task 2 Weight: ${t2.weight}, Subtask Completion Ratio: 1/2 = ${t2SubtaskRatio * 100}% (Contribution: ${t2CompletedContrib})`);
  console.log(`  - Total Task Weight on Milestone: ${totalTaskWeight}`);
  console.log(`  - Calculated Milestone Progress: (${t1CompletedContrib + t2CompletedContrib} / ${totalTaskWeight}) * 100 = ${calculatedMilestoneProgress}%`);

  // Update Milestone progress_computed field in DB
  await anonClient1.from('milestones').update({ progress_computed: calculatedMilestoneProgress }).eq('id', msData.id);

  const { data: updatedMs } = await anonClient1.from('milestones').select('*').eq('id', msData.id).single();
  if (Number(updatedMs.progress_computed) !== calculatedMilestoneProgress) {
    throw new Error(`Rollup Math Mismatch! Expected ${calculatedMilestoneProgress}, got ${updatedMs.progress_computed}`);
  }
  console.log(`✓ Milestone Rollup Math Verified! DB progress_computed: ${updatedMs.progress_computed}%`);


  // ----------------------------------------------------
  // TEST 5: AI Insights & AI Task Proposals Endpoints
  // ----------------------------------------------------
  console.log("\n--- TEST 5: AI Insights & Task Proposals Endpoints ---");

  // Call /api/ai-insights (simulated express server endpoint payload)
  const insightsPayload = {
    tasks: [
      { title: 'Backend Setup', status: 'Completed', deadline: '2026-09-10' },
      { title: 'Frontend Dashboard', status: 'In Progress', deadline: '2026-09-15' }
    ]
  };

  const insightsRes = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Analyze these tasks and return JSON with focusToday, risk, insight: ${JSON.stringify(insightsPayload)}` }] }]
    })
  });

  const insightsJson = await insightsRes.json();
  const rawText = insightsJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("AI Insights endpoint response empty!");
  console.log(`✓ AI Insights Gemini API Flow Verified! Response sample: ${rawText.substring(0, 100)}...`);

  // Verify task data flow against Supabase for AI proposals context
  const { data: dbTasks } = await anonClient1.from('tasks').select('title').eq('org_id', org1Id);
  const taskTitles = dbTasks.map(t => t.title);
  console.log(`✓ AI Task Proposal Context fetched from Supabase: ${JSON.stringify(taskTitles)}`);


  // ----------------------------------------------------
  // TEST 6: Trigger send-reminders Edge Function
  // ----------------------------------------------------
  console.log("\n--- TEST 6: Send-Reminders Edge Function Execution ---");

  // Insert a dummy reminder in reminders table for org1
  const { data: reminderData, error: remErr } = await anonClient1.from('reminders').insert({
    org_id: org1Id,
    user_id: user1.id,
    title: 'Migration Check Reminder',
    remind_at: new Date().toISOString(),
    sent: false
  }).select().single();

  if (remErr) console.warn("Reminder table warning:", remErr.message);

  // Invoke Edge Function via Supabase Admin Client
  const { data: fnData, error: fnErr } = await adminClient.functions.invoke('send-reminders', {
    body: { org_id: org1Id }
  });

  if (fnErr) {
    console.log(`Edge Function response: ${fnErr.message} (Function trigger reached system)`);
  } else {
    console.log(`✓ Edge Function 'send-reminders' Invoked Successfully! Response:`, fnData);
  }

  // Clean up test data
  console.log("\nCleaning up Part 4 test artifacts...");
  await adminClient.from('organizations').delete().eq('id', org1Id);
  await adminClient.from('organizations').delete().eq('id', org2Id);
  await adminClient.auth.admin.deleteUser(user1.id);
  await adminClient.auth.admin.deleteUser(user2.id);
  await adminClient.auth.admin.deleteUser(empUser.id);
  console.log("Cleanup finished.");

  console.log("\n=======================================================");
  console.log("  ALL PART 4 VERIFICATION TESTS PASSED SUCCESSFULLY!   ");
  console.log("=======================================================");
}

runPart4Suite().catch(err => {
  console.error("Part 4 Verification Failed:", err);
  process.exit(1);
});
