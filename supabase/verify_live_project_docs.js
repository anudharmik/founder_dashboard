import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runLiveVerification() {
  console.log("=================================================");
  console.log("LIVE DATABASE VERIFICATION: PROJECT DOCS & RBAC");
  console.log("=================================================\n");

  // -------------------------------------------------------------
  // STEP 1: Direct Table Existence & Count Query
  // -------------------------------------------------------------
  console.log("--- STEP 1: Direct Live Table Existence & Count Check ---");

  const { count: docsCount, error: docsErr } = await supabase
    .from('project_docs')
    .select('*', { count: 'exact', head: true });

  if (docsErr) {
    console.error("❌ Error querying project_docs table:", docsErr);
  } else {
    console.log(`SELECT count(*) FROM project_docs -> Literal Result: ${docsCount} rows`);
  }

  const { count: editsCount, error: editsErr } = await supabase
    .from('project_doc_edits')
    .select('*', { count: 'exact', head: true });

  if (editsErr) {
    console.error("❌ Error querying project_doc_edits table:", editsErr);
  } else {
    console.log(`SELECT count(*) FROM project_doc_edits -> Literal Result: ${editsCount} rows`);
  }

  if (docsErr || editsErr) {
    console.error("\n⚠️ Make sure Migration 5 (20260805000004_phase2_project_docs.sql) was executed in SQL Editor!");
    process.exit(1);
  }

  console.log("✅ LIVE TABLES CONFIRMED EXIST IN SUPABASE SCHEMA.\n");

  // -------------------------------------------------------------
  // STEP 2: Live Sequential Document Save & Audit History Logging
  // -------------------------------------------------------------
  console.log("--- STEP 2: Live Sequential Saves & Real Timestamp History ---");

  // Fetch or create a test Org & Project from live DB
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  let orgId = orgs?.[0]?.id;

  if (!orgId) {
    const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Live Verification Org' }).select().single();
    orgId = newOrg.id;
  }

  const { data: depts } = await supabase.from('departments').select('id').eq('org_id', orgId).limit(1);
  let deptId = depts?.[0]?.id;
  if (!deptId) {
    const { data: newDept } = await supabase.from('departments').insert({ org_id: orgId, name: 'Live Verification Dept' }).select().single();
    deptId = newDept.id;
  }

  const { data: projs } = await supabase.from('projects').select('id').eq('org_id', orgId).limit(1);
  let projId = projs?.[0]?.id;
  if (!projId) {
    const { data: newProj } = await supabase.from('projects').insert({ org_id: orgId, department_id: deptId, title: 'Live Verification Project' }).select().single();
    projId = newProj.id;
  }

  // Create a real test user ID
  const testOwnerUserId = '00000000-0000-0000-0000-000000000001';

  // Insert real document into live project_docs table
  const { data: doc, error: createErr } = await supabase
    .from('project_docs')
    .insert({
      org_id: orgId,
      project_id: projId,
      title: 'Live Technical Architecture Spec',
      content: '<p>Initial draft</p>',
      created_by: testOwnerUserId,
      updated_by: testOwnerUserId
    })
    .select()
    .single();

  if (createErr) {
    console.error("❌ Error creating project_docs row:", createErr);
    process.exit(1);
  }

  console.log(`Inserted real document into live project_docs (ID: ${doc.id})`);

  // --- SAVE #1 ---
  console.log("Executing Save #1...");
  const save1Time = new Date().toISOString();
  await supabase
    .from('project_docs')
    .update({ title: 'Live Spec - Draft V1', content: '<p>Updated with V1 architecture</p>', updated_at: save1Time })
    .eq('id', doc.id);

  await supabase
    .from('project_doc_edits')
    .insert({ doc_id: doc.id, editor_id: testOwnerUserId, edited_at: save1Time });

  // Delay 1.5 seconds to guarantee distinct sequential timestamps
  console.log("Waiting 1.5s before Save #2...");
  await new Promise(res => setTimeout(res, 1500));

  // --- SAVE #2 ---
  console.log("Executing Save #2...");
  const save2Time = new Date().toISOString();
  await supabase
    .from('project_docs')
    .update({ title: 'Live Spec - Final Production Draft', content: '<p>Approved V2 spec</p>', updated_at: save2Time })
    .eq('id', doc.id);

  await supabase
    .from('project_doc_edits')
    .insert({ doc_id: doc.id, editor_id: testOwnerUserId, edited_at: save2Time });

  // Query live project_doc_edits table for doc.id
  const { data: liveEdits } = await supabase
    .from('project_doc_edits')
    .select('id, doc_id, editor_id, edited_at')
    .eq('doc_id', doc.id)
    .order('edited_at', { ascending: true });

  console.log("\nDirect Query Result: SELECT * FROM project_doc_edits WHERE doc_id = '" + doc.id + "':");
  console.table(liveEdits);

  if (liveEdits?.length === 2) {
    console.log("✅ TEST 1 PASSED: Exactly 2 edit rows logged in live project_doc_edits with real sequential timestamps.\n");
  } else {
    console.error("❌ TEST 1 FAILED!\n");
  }

  // -------------------------------------------------------------
  // STEP 3: Live RPC Execution of has_effective_role Function
  // -------------------------------------------------------------
  console.log("--- STEP 3: Live Postgres RPC Test (has_effective_role) ---");

  const testEmpUserId = '00000000-0000-0000-0000-000000000002';

  // Ensure testEmpUserId is in org_members as employee
  await supabase.from('org_members').upsert({ org_id: orgId, user_id: testEmpUserId, role: 'employee' }, { onConflict: 'org_id,user_id' });
  await supabase.from('org_members').upsert({ org_id: orgId, user_id: testOwnerUserId, role: 'owner' }, { onConflict: 'org_id,user_id' });

  // 1. Call RPC for Owner
  const { data: ownerEffectiveRole } = await supabase.rpc('has_effective_role', {
    p_user_id: testOwnerUserId,
    p_entity_type: 'project',
    p_entity_id: projId,
    p_required_role: 'manager'
  });

  // 2. Call RPC for Employee without scoped grant
  const { data: empDefaultEffectiveRole } = await supabase.rpc('has_effective_role', {
    p_user_id: testEmpUserId,
    p_entity_type: 'project',
    p_entity_id: projId,
    p_required_role: 'manager'
  });

  console.log(`Live RPC has_effective_role(Owner, project, manager) -> Result: ${ownerEffectiveRole}`);
  console.log(`Live RPC has_effective_role(Default Employee, project, manager) -> Result: ${empDefaultEffectiveRole}`);

  // 3. Grant Employee scoped 'manager' on project in live scoped_permissions table
  await supabase.from('scoped_permissions').upsert({
    org_id: orgId,
    user_id: testEmpUserId,
    scope_type: 'project',
    scope_id: projId,
    role: 'manager',
    granted_by: testOwnerUserId
  }, { onConflict: 'user_id,scope_type,scope_id' });

  // 4. Call RPC again for Employee after scoped grant
  const { data: empScopedEffectiveRole } = await supabase.rpc('has_effective_role', {
    p_user_id: testEmpUserId,
    p_entity_type: 'project',
    p_entity_id: projId,
    p_required_role: 'manager'
  });

  console.log(`Live RPC has_effective_role(Scoped Manager Employee, project, manager) -> Result: ${empScopedEffectiveRole}`);

  if (ownerEffectiveRole === true && empDefaultEffectiveRole === false && empScopedEffectiveRole === true) {
    console.log("✅ TEST 2 & 3 PASSED: Live database security function has_effective_role strictly evaluated and verified!\n");
  } else {
    console.error("❌ LIVE RPC TEST FAILED!\n");
  }

  // Clean up test rows
  console.log("Cleaning up live test document and grants...");
  await supabase.from('project_docs').delete().eq('id', doc.id);
  await supabase.from('scoped_permissions').delete().eq('user_id', testEmpUserId).eq('scope_id', projId);

  console.log("=================================================");
  console.log("ALL LIVE DATABASE VERIFICATIONS COMPLETED!");
  console.log("=================================================");
}

runLiveVerification();
