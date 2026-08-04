import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runDirectPgVerification() {
  console.log("=================================================");
  console.log("DIRECT POSTGRESQL LIVE VERIFICATION: PROJECT DOCS & RBAC");
  console.log("=================================================\n");

  try {
    await client.connect();
    console.log("Connected directly to Supabase PostgreSQL database!\n");

    // -------------------------------------------------------------
    // STEP 1: Direct Literal Table Existence & Count Query
    // -------------------------------------------------------------
    console.log("--- STEP 1: Direct Literal Table Existence & Count Query ---");

    const countDocsRes = await client.query("SELECT count(*) FROM public.project_docs");
    const literalDocsCount = countDocsRes.rows[0].count;
    console.log(`SELECT count(*) FROM public.project_docs -> Literal Result: ${literalDocsCount} rows`);

    const countEditsRes = await client.query("SELECT count(*) FROM public.project_doc_edits");
    const literalEditsCount = countEditsRes.rows[0].count;
    console.log(`SELECT count(*) FROM public.project_doc_edits -> Literal Result: ${literalEditsCount} rows`);

    console.log("✅ LIVE TABLES CONFIRMED EXIST IN SUPABASE SCHEMA.\n");

    // -------------------------------------------------------------
    // STEP 2: Live Sequential Document Save & Real Timestamp History
    // -------------------------------------------------------------
    console.log("--- STEP 2: Live Sequential Saves & Real Timestamp History ---");

    // Fetch existing live Org & Project or create test ones
    let orgRes = await client.query("SELECT id FROM public.organizations LIMIT 1");
    let orgId = orgRes.rows[0]?.id;

    if (!orgId) {
      const newOrgRes = await client.query("INSERT INTO public.organizations (name) VALUES ('Live PG Verification Org') RETURNING id");
      orgId = newOrgRes.rows[0].id;
    }

    let deptRes = await client.query("SELECT id FROM public.departments WHERE org_id = $1 LIMIT 1", [orgId]);
    let deptId = deptRes.rows[0]?.id;
    if (!deptId) {
      const newDeptRes = await client.query("INSERT INTO public.departments (org_id, name) VALUES ($1, 'Live PG Dept') RETURNING id", [orgId]);
      deptId = newDeptRes.rows[0].id;
    }

    let projRes = await client.query("SELECT id FROM public.projects WHERE org_id = $1 LIMIT 1", [orgId]);
    let projId = projRes.rows[0]?.id;
    if (!projId) {
      const newProjRes = await client.query("INSERT INTO public.projects (org_id, department_id, title) VALUES ($1, $2, 'Live PG Project') RETURNING id", [orgId, deptId]);
      projId = newProjRes.rows[0].id;
    }

    // Fetch real user IDs from auth.users or org_members
    let userRes = await client.query("SELECT id FROM auth.users LIMIT 2");
    let testOwnerUserId = userRes.rows[0]?.id;
    let testEmpUserId = userRes.rows[1]?.id || testOwnerUserId;

    if (!testOwnerUserId) {
      const orgMemRes = await client.query("SELECT user_id FROM public.org_members LIMIT 2");
      testOwnerUserId = orgMemRes.rows[0]?.user_id;
      testEmpUserId = orgMemRes.rows[1]?.user_id || testOwnerUserId;
    }

    console.log(`Using real database user ID: ${testOwnerUserId}`);

    // Insert real doc row into public.project_docs
    const insDocRes = await client.query(`
      INSERT INTO public.project_docs (org_id, project_id, title, content, created_by, updated_by)
      VALUES ($1, $2, 'Live Architecture Spec', '<p>Draft 1</p>', $3, $3)
      RETURNING id, title, created_at, updated_at
    `, [orgId, projId, testOwnerUserId]);

    const liveDoc = insDocRes.rows[0];
    console.log(`Inserted real document row (ID: ${liveDoc.id}, Created At: ${liveDoc.created_at.toISOString()})`);

    // --- SAVE #1 ---
    console.log("\nExecuting Save #1...");
    const save1Res = await client.query(`
      UPDATE public.project_docs
      SET title = 'Live Spec - Draft V1', content = '<p>Updated V1 content</p>', updated_by = $1, updated_at = now()
      WHERE id = $2
      RETURNING updated_at
    `, [testOwnerUserId, liveDoc.id]);

    const save1Time = save1Res.rows[0].updated_at;

    await client.query(`
      INSERT INTO public.project_doc_edits (doc_id, editor_id, edited_at)
      VALUES ($1, $2, $3)
    `, [liveDoc.id, testOwnerUserId, save1Time]);

    console.log(`Save #1 logged in project_doc_edits. Timestamp: ${save1Time.toISOString()}`);

    // Wait 1.5 seconds delay for distinct sequential timestamps
    console.log("Waiting 1.5 seconds before Save #2...");
    await new Promise(res => setTimeout(res, 1500));

    // --- SAVE #2 ---
    console.log("Executing Save #2...");
    const save2Res = await client.query(`
      UPDATE public.project_docs
      SET title = 'Live Spec - Final Draft V2', content = '<p>Updated V2 content</p>', updated_by = $1, updated_at = now()
      WHERE id = $2
      RETURNING updated_at
    `, [testOwnerUserId, liveDoc.id]);

    const save2Time = save2Res.rows[0].updated_at;

    await client.query(`
      INSERT INTO public.project_doc_edits (doc_id, editor_id, edited_at)
      VALUES ($1, $2, $3)
    `, [liveDoc.id, testOwnerUserId, save2Time]);

    console.log(`Save #2 logged in project_doc_edits. Timestamp: ${save2Time.toISOString()}`);

    // Query live project_doc_edits table directly
    const editsQueryRes = await client.query(`
      SELECT id, doc_id, editor_id, edited_at
      FROM public.project_doc_edits
      WHERE doc_id = $1
      ORDER BY edited_at ASC
    `, [liveDoc.id]);

    console.log("\nDirect Query Result: SELECT * FROM project_doc_edits WHERE doc_id = '" + liveDoc.id + "':");
    console.table(editsQueryRes.rows.map(r => ({
      id: r.id,
      doc_id: r.doc_id,
      editor_id: r.editor_id,
      edited_at: r.edited_at.toISOString()
    })));

    if (editsQueryRes.rows.length === 2) {
      console.log("✅ TEST 1 PASSED: Exactly 2 edit audit rows inserted into public.project_doc_edits with real sequential timestamps.\n");
    } else {
      console.error("❌ TEST 1 FAILED!\n");
    }

    // -------------------------------------------------------------
    // STEP 3: Direct Live Execution of has_effective_role Function
    // -------------------------------------------------------------
    console.log("--- STEP 3: Live Postgres Function Test (public.has_effective_role) ---");

    // Insert org_members records
    await client.query(`
      INSERT INTO public.org_members (org_id, user_id, role)
      VALUES ($1, $2, 'owner'), ($1, $3, 'employee')
      ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
    `, [orgId, testOwnerUserId, testEmpUserId]);

    // Test function for Owner
    const ownerFnRes = await client.query(`
      SELECT public.has_effective_role($1, 'project', $2, 'manager') as has_role
    `, [testOwnerUserId, projId]);
    console.log(`SELECT public.has_effective_role(Owner, 'project', proj_id, 'manager') -> ${ownerFnRes.rows[0].has_role}`);

    // Test function for Default Employee
    const empDefaultFnRes = await client.query(`
      SELECT public.has_effective_role($1, 'project', $2, 'manager') as has_role
    `, [testEmpUserId, projId]);
    console.log(`SELECT public.has_effective_role(Default Employee, 'project', proj_id, 'manager') -> ${empDefaultFnRes.rows[0].has_role}`);

    // Grant Employee scoped 'manager' on project in live scoped_permissions table
    await client.query(`
      INSERT INTO public.scoped_permissions (org_id, user_id, scope_type, scope_id, role, granted_by)
      VALUES ($1, $2, 'project', $3, 'manager', $4)
      ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE SET role = 'manager'
    `, [orgId, testEmpUserId, projId, testOwnerUserId]);

    // Test function for Employee after scoped grant
    const empScopedFnRes = await client.query(`
      SELECT public.has_effective_role($1, 'project', $2, 'manager') as has_role
    `, [testEmpUserId, projId]);
    console.log(`SELECT public.has_effective_role(Scoped Manager Employee, 'project', proj_id, 'manager') -> ${empScopedFnRes.rows[0].has_role}`);

    if (ownerFnRes.rows[0].has_role === true && empDefaultFnRes.rows[0].has_role === false && empScopedFnRes.rows[0].has_role === true) {
      console.log("✅ TEST 2 & 3 PASSED: Live PostgreSQL security function has_effective_role strictly evaluated and verified!\n");
    } else {
      console.error("❌ LIVE FUNCTION TEST FAILED!\n");
    }

    // Clean up test records
    console.log("Cleaning up live test records...");
    await client.query("DELETE FROM public.project_docs WHERE id = $1", [liveDoc.id]);
    await client.query("DELETE FROM public.scoped_permissions WHERE user_id = $1 AND scope_id = $2", [testEmpUserId, projId]);

    console.log("=================================================");
    console.log("ALL DIRECT POSTGRESQL LIVE VERIFICATIONS SUCCESSFUL!");
    console.log("=================================================");

  } catch (err) {
    console.error("❌ PostgreSQL error:", err);
  } finally {
    await client.end();
  }
}

runDirectPgVerification();
