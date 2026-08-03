import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runProjectGoalCrudVerification() {
  console.log("=================================================");
  console.log("FOUNDEROS PHASE 1 — PROJECT & GOAL CRUD RLS VERIFICATION");
  console.log("=================================================\n");

  const ts = Date.now();
  const ownerBEmail = `owner_b_${ts}@example.com`;
  const managerBEmail = `manager_b_${ts}@example.com`;
  const employeeBEmail = `employee_b_${ts}@example.com`;
  const ownerAEmail = `owner_a_${ts}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log("1. Creating test accounts...");
  const { data: uOwnerB, error: e1 } = await supabaseAdmin.auth.admin.createUser({ email: ownerBEmail, password: testPassword, email_confirm: true });
  const { data: uManagerB, error: e2 } = await supabaseAdmin.auth.admin.createUser({ email: managerBEmail, password: testPassword, email_confirm: true });
  const { data: uEmployeeB, error: e3 } = await supabaseAdmin.auth.admin.createUser({ email: employeeBEmail, password: testPassword, email_confirm: true });
  const { data: uOwnerA, error: e4 } = await supabaseAdmin.auth.admin.createUser({ email: ownerAEmail, password: testPassword, email_confirm: true });

  if (e1 || e2 || e3 || e4) {
    console.error("Account creation failed:", e1 || e2 || e3 || e4);
    return;
  }

  const clientOwnerB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientManagerB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientEmployeeB = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const clientOwnerA = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  await clientOwnerB.auth.signInWithPassword({ email: ownerBEmail, password: testPassword });
  await clientManagerB.auth.signInWithPassword({ email: managerBEmail, password: testPassword });
  await clientEmployeeB.auth.signInWithPassword({ email: employeeBEmail, password: testPassword });
  await clientOwnerA.auth.signInWithPassword({ email: ownerAEmail, password: testPassword });

  console.log("✅ Authenticated 4 test sessions.\n");

  // Setup Orgs
  // Org B
  const { data: orgB } = await clientOwnerB.from('organizations').insert({ name: 'Org B (Project Test)' }).select().single();
  // Org A
  const { data: orgA } = await clientOwnerA.from('organizations').insert({ name: 'Org A (Isolation Test)' }).select().single();

  // Invite Manager B and Employee B into Org B
  await clientOwnerB.from('org_members').insert({ org_id: orgB.id, user_id: uManagerB.user.id, role: 'manager' });
  await clientOwnerB.from('org_members').insert({ org_id: orgB.id, user_id: uEmployeeB.user.id, role: 'employee' });

  // Create Department in Org B as Owner B
  const { data: deptB } = await clientOwnerB.from('departments').insert({ org_id: orgB.id, name: 'Product Dept' }).select().single();

  // Create Team in Org B as Owner B
  const { data: teamB } = await clientOwnerB.from('teams').insert({ org_id: orgB.id, name: 'Core Eng Team' }).select().single();

  console.log("Setup complete:", { orgB_id: orgB.id, deptB_id: deptB.id, teamB_id: teamB.id });

  // ----------------------------------------------------
  // TEST CASE 1: Owner creates project & associates team
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 1: Owner creates project under department and associates team ---");
  const { data: projB, error: errProjB } = await clientOwnerB.from('projects').insert({
    org_id: orgB.id,
    department_id: deptB.id,
    title: 'Org B Flagship Project',
    description: 'Main product project',
    created_by: uOwnerB.user.id
  }).select().single();

  if (projB) {
    await clientOwnerB.from('project_teams').insert({ project_id: projB.id, team_id: teamB.id });
  }

  const { data: verifyProj } = await clientOwnerB
    .from('projects')
    .select('*, project_teams(team_id)')
    .eq('id', projB?.id)
    .single();

  console.log("TEST 1 RESULT:", {
    persisted_id: verifyProj?.id,
    org_id: verifyProj?.org_id,
    department_id: verifyProj?.department_id,
    associated_team_id: verifyProj?.project_teams?.[0]?.team_id,
    error: errProjB
  });

  // ----------------------------------------------------
  // TEST CASE 2: Manager creates goal with weight=2
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 2: Manager creates goal with weight=2 ---");
  const { data: goalB, error: errGoalB } = await clientManagerB.from('goals').insert({
    org_id: orgB.id,
    project_id: projB.id,
    title: 'Q3 Revenue Milestone Goal',
    description: 'Hit key revenue target',
    weight: 2,
    status: 'active',
    risk_flag: 'none',
    created_by: uManagerB.user.id
  }).select().single();

  console.log("TEST 2 RESULT:", {
    goal_id: goalB?.id,
    project_id: goalB?.project_id,
    weight: goalB?.weight,
    org_id: goalB?.org_id,
    error: errGoalB
  });

  // ----------------------------------------------------
  // TEST CASE 3: Employee attempts goal creation
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 3: Employee attempts goal creation ---");
  const { data: empGoal, error: errEmpGoal } = await clientEmployeeB.from('goals').insert({
    org_id: orgB.id,
    project_id: projB.id,
    title: 'Rogue Employee Goal',
    weight: 1
  }).select().single();

  console.log("TEST 3 RESULT (Direct Write):", {
    data: empGoal,
    error_code: errEmpGoal?.code,
    error_message: errEmpGoal?.message
  });

  // ----------------------------------------------------
  // TEST CASE 4: Owner sets & clears progress_override
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 4: Owner sets and clears progress_override ---");
  // Set Override to 50
  const { data: overrideGoal, error: errSetOverride } = await clientOwnerB.from('goals').update({
    progress_override: 50,
    progress_override_by: uOwnerB.user.id,
    progress_override_at: new Date().toISOString(),
    progress_override_previous: goalB?.progress_computed || 0
  }).eq('id', goalB.id).select().single();

  console.log("TEST 4A RESULT (Set Override 50):", {
    progress_override: overrideGoal?.progress_override,
    progress_override_by: overrideGoal?.progress_override_by,
    progress_override_at: overrideGoal?.progress_override_at,
    progress_override_previous: overrideGoal?.progress_override_previous,
    error: errSetOverride
  });

  // Clear Override
  const { data: clearedGoal, error: errClearOverride } = await clientOwnerB.from('goals').update({
    progress_override: null,
    progress_override_by: null,
    progress_override_at: null,
    progress_override_previous: null
  }).eq('id', goalB.id).select().single();

  console.log("TEST 4B RESULT (Clear Override):", {
    progress_override: clearedGoal?.progress_override,
    progress_override_by: clearedGoal?.progress_override_by,
    progress_override_at: clearedGoal?.progress_override_at,
    progress_override_previous: clearedGoal?.progress_override_previous,
    error: errClearOverride
  });

  // ----------------------------------------------------
  // TEST CASE 5: Cross-tenant isolation (Org A user)
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 5: Cross-tenant isolation ---");
  const { data: orgAProjs, error: errOrgAProjs } = await clientOwnerA.from('projects').select('*').eq('org_id', orgB.id);
  const { data: orgAGoals, error: errOrgAGoals } = await clientOwnerA.from('goals').select('*').eq('org_id', orgB.id);

  console.log("TEST 5 RESULT (Org A querying Org B data):", {
    projects_returned_count: orgAProjs?.length || 0,
    goals_returned_count: orgAGoals?.length || 0,
    proj_error: errOrgAProjs,
    goal_error: errOrgAGoals
  });

  // Cleanup
  console.log("\nCleaning up test accounts...");
  await supabaseAdmin.auth.admin.deleteUser(uOwnerB.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uManagerB.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uEmployeeB.user.id);
  await supabaseAdmin.auth.admin.deleteUser(uOwnerA.user.id);
  console.log("Cleanup finished.\n");
}

runProjectGoalCrudVerification();
