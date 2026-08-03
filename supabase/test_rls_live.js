import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runLiveRlsVerification() {
  console.log("=================================================");
  console.log("FOUNDEROS PHASE 1 — LIVE RLS & ROLE-GATING TESTS");
  console.log("=================================================\n");

  // Step 0: Check if tables exist
  const { error: tableCheck } = await supabaseAdmin.from('organizations').select('*').limit(1);
  if (tableCheck && (tableCheck.code === 'PGRST205' || tableCheck.message?.includes('Could not find'))) {
    console.error("❌ CRITICAL BLOCKER: Phase 1 tables do NOT exist on the live Supabase project yet.");
    console.error("The SQL migration script 'supabase/migrations/20260803000000_phase1_schema.sql' must be executed in the Supabase Dashboard SQL Editor before running live RLS tests.");
    console.log("\nTable Check Result:", tableCheck);
    return;
  }

  // Create 3 real test accounts via Service Role API
  const ts = Date.now();
  const user1Email = `test_owner_a_${ts}@example.com`;
  const user2Email = `test_owner_b_${ts}@example.com`;
  const user3Email = `test_employee_b_${ts}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log("Creating test accounts...");
  const { data: u1, error: e1 } = await supabaseAdmin.auth.admin.createUser({ email: user1Email, password: testPassword, email_confirm: true });
  const { data: u2, error: e2 } = await supabaseAdmin.auth.admin.createUser({ email: user2Email, password: testPassword, email_confirm: true });
  const { data: u3, error: e3 } = await supabaseAdmin.auth.admin.createUser({ email: user3Email, password: testPassword, email_confirm: true });

  if (e1 || e2 || e3) {
    console.error("User creation failed:", e1 || e2 || e3);
    return;
  }

  const client1 = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const client2 = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const client3 = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  await client1.auth.signInWithPassword({ email: user1Email, password: testPassword });
  await client2.auth.signInWithPassword({ email: user2Email, password: testPassword });
  await client3.auth.signInWithPassword({ email: user3Email, password: testPassword });

  console.log("✅ Authenticated 3 test sessions.\n");

  // ----------------------------------------------------
  // TEST CASE 1: Cross-tenant isolation (Org A vs Org B)
  // ----------------------------------------------------
  console.log("--- TEST CASE 1: Cross-tenant isolation ---");
  const { data: orgA, error: errOrgA } = await client1.from('organizations').insert({ name: 'Org A (Test)' }).select().single();
  if (errOrgA) console.log("Org A creation error:", errOrgA);
  else await client1.from('org_members').upsert({ org_id: orgA.id, user_id: u1.user.id, role: 'owner' }, { onConflict: 'org_id,user_id' });

  const { data: orgB, error: errOrgB } = await client2.from('organizations').insert({ name: 'Org B (Test)' }).select().single();
  if (errOrgB) console.log("Org B creation error:", errOrgB);
  else await client2.from('org_members').upsert({ org_id: orgB.id, user_id: u2.user.id, role: 'owner' }, { onConflict: 'org_id,user_id' });

  // Create Dept, Team, Project in Org A as User 1
  let deptA, teamA, projA;
  if (orgA) {
    const resD = await client1.from('departments').insert({ org_id: orgA.id, name: 'Org A Secret Dept' }).select().single();
    deptA = resD.data;
    const resT = await client1.from('teams').insert({ org_id: orgA.id, name: 'Org A Secret Team' }).select().single();
    teamA = resT.data;
    if (deptA) {
      const resP = await client1.from('projects').insert({ org_id: orgA.id, department_id: deptA.id, title: 'Org A Secret Project' }).select().single();
      projA = resP.data;
    }
  }

  // Attempt SELECT as User 2 on Org A's resources
  const selectDepts = await client2.from('departments').select('*').eq('org_id', orgA?.id);
  const selectTeams = await client2.from('teams').select('*').eq('org_id', orgA?.id);
  const selectProjs = await client2.from('projects').select('*').eq('org_id', orgA?.id);

  console.log("User 2 SELECT Org A Departments:", { data: selectDepts.data, error: selectDepts.error });
  console.log("User 2 SELECT Org A Teams:", { data: selectTeams.data, error: selectTeams.error });
  console.log("User 2 SELECT Org A Projects:", { data: selectProjs.data, error: selectProjs.error });

  // ----------------------------------------------------
  // TEST CASE 2: Member Invite & Role Assignment
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 2: Member Invite & Role Assignment ---");
  const { data: mem3, error: errMem3 } = await client2.from('org_members').insert({
    org_id: orgB?.id,
    user_id: u3.user.id,
    role: 'employee'
  }).select().single();

  console.log("Org B Member insert result for User 3:", { data: mem3, error: errMem3 });

  const { data: checkMem3, error: errCheckMem3 } = await client3.from('org_members').select('*').eq('user_id', u3.user.id);
  console.log("User 3 org_members query:", { data: checkMem3, error: errCheckMem3 });

  // ----------------------------------------------------
  // TEST CASE 3: Department Creation Role Gating
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 3: Department Creation (Owner vs Employee) ---");
  const ownerDept = await client2.from('departments').insert({ org_id: orgB?.id, name: 'Org B Eng Dept' }).select().single();
  console.log("Owner (User 2) create department:", { data: ownerDept.data, error: ownerDept.error });

  const empDept = await client3.from('departments').insert({ org_id: orgB?.id, name: 'Employee Rogue Dept' }).select().single();
  console.log("Employee (User 3) direct create department result:", { data: empDept.data, error: empDept.error });

  // ----------------------------------------------------
  // TEST CASE 4: Team Creation Role Gating
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 4: Team Creation (Employee) ---");
  const empTeam = await client3.from('teams').insert({ org_id: orgB?.id, name: 'Employee Rogue Team' }).select().single();
  console.log("Employee (User 3) direct create team result:", { data: empTeam.data, error: empTeam.error });

  // ----------------------------------------------------
  // TEST CASE 5: Team Membership Lifecycle
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 5: Team Membership Lifecycle ---");
  const ownerTeam = await client2.from('teams').insert({ org_id: orgB?.id, name: 'Org B Core Team' }).select().single();
  console.log("Owner create team:", { data: ownerTeam.data, error: ownerTeam.error });

  if (ownerTeam.data) {
    const addMem = await client2.from('team_members').insert({ team_id: ownerTeam.data.id, user_id: u3.user.id }).select();
    console.log("Add User 3 to team_members:", { data: addMem.data, error: addMem.error });

    const checkTeamMems = await client2.from('team_members').select('*').eq('team_id', ownerTeam.data.id);
    console.log("Team members after ADD:", checkTeamMems.data);

    const remMem = await client2.from('team_members').delete().eq('team_id', ownerTeam.data.id).eq('user_id', u3.user.id);
    console.log("Remove User 3 from team_members:", { error: remMem.error });

    const checkTeamMemsAfter = await client2.from('team_members').select('*').eq('team_id', ownerTeam.data.id);
    console.log("Team members after REMOVE:", checkTeamMemsAfter.data);
  }

  // Cleanup test users
  console.log("\nCleaning up test accounts...");
  await supabaseAdmin.auth.admin.deleteUser(u1.user.id);
  await supabaseAdmin.auth.admin.deleteUser(u2.user.id);
  await supabaseAdmin.auth.admin.deleteUser(u3.user.id);
  console.log("Cleanup finished.");
}

runLiveRlsVerification();
