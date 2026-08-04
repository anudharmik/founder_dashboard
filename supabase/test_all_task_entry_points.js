import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testAllTaskEntryPoints() {
  console.log("=================================================");
  console.log("TESTING ALL TASK CREATION ENTRY POINTS ON LIVE DB");
  console.log("=================================================\n");

  try {
    await client.connect();

    // Fetch org, dept, project, goal, milestone, user
    const orgRes = await client.query("SELECT id FROM public.organizations LIMIT 1");
    const orgId = orgRes.rows[0].id;

    const deptRes = await client.query("SELECT id FROM public.departments WHERE org_id = $1 LIMIT 1", [orgId]);
    let deptId = deptRes.rows[0]?.id;
    if (!deptId) {
      const newDept = await client.query("INSERT INTO public.organizations (name) VALUES ('Test Dept') RETURNING id");
      deptId = newDept.rows[0].id;
    }

    const projRes = await client.query("SELECT id FROM public.projects WHERE org_id = $1 LIMIT 1", [orgId]);
    let projId = projRes.rows[0]?.id;
    if (!projId) {
      const newProj = await client.query("INSERT INTO public.projects (org_id, department_id, title) VALUES ($1, $2, 'Test Proj') RETURNING id", [orgId, deptId]);
      projId = newProj.rows[0].id;
    }

    const goalRes = await client.query("SELECT id FROM public.goals WHERE org_id = $1 LIMIT 1", [orgId]);
    let goalId = goalRes.rows[0]?.id;
    if (!goalId) {
      const newGoal = await client.query("INSERT INTO public.goals (org_id, project_id, title) VALUES ($1, $2, 'Test Goal') RETURNING id", [orgId, projId]);
      goalId = newGoal.rows[0].id;
    }

    const msRes = await client.query("SELECT id FROM public.milestones WHERE goal_id = $1 LIMIT 1", [goalId]);
    let msId = msRes.rows[0]?.id;
    if (!msId) {
      const newMs = await client.query("INSERT INTO public.milestones (org_id, goal_id, title) VALUES ($1, $2, 'Test Milestone') RETURNING id", [orgId, goalId]);
      msId = newMs.rows[0].id;
    }

    const userRes = await client.query("SELECT id FROM auth.users LIMIT 1");
    const userId = userRes.rows[0].id;

    // -------------------------------------------------------------
    // ENTRY POINT 1: GoalDetail.jsx Milestone Card (+ Task button)
    // -------------------------------------------------------------
    console.log("--- ENTRY POINT 1: GoalDetail.jsx Milestone (+ Task) ---");
    try {
      const ep1Res = await client.query(`
        INSERT INTO public.tasks (
          org_id, goal_id, milestone_id, title, description, weight,
          deadline, assignee_id, assigner_id, reviewer_id, approval_status, blocked_by, completed
        )
        VALUES ($1, $2, $3, 'EP1: Milestone Task', 'Milestone card modal task', 1, NULL, $4, $4, $4, 'not_required', NULL, false)
        RETURNING *
      `, [orgId, goalId, msId, userId]);

      console.log("✅ ENTRY POINT 1 SUCCESS: Inserted task ID:", ep1Res.rows[0].id);
      await client.query("DELETE FROM public.tasks WHERE id = $1", [ep1Res.rows[0].id]);
    } catch (err) {
      console.error("❌ ENTRY POINT 1 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // ENTRY POINT 2: Goals.jsx inline addTask(goalId)
    // -------------------------------------------------------------
    console.log("\n--- ENTRY POINT 2: Goals.jsx inline addTask() ---");
    try {
      const ep2Res = await client.query(`
        INSERT INTO public.tasks (
          org_id, goal_id, milestone_id, title, assignee_id, assigner_id, weight, completed, deadline
        )
        VALUES ($1, $2, $3, 'EP2: Goals.jsx Task', $4, $4, 1, false, NULL)
        RETURNING *
      `, [orgId, goalId, msId, userId]);

      console.log("✅ ENTRY POINT 2 SUCCESS: Inserted task ID:", ep2Res.rows[0].id);
      await client.query("DELETE FROM public.tasks WHERE id = $1", [ep2Res.rows[0].id]);
    } catch (err) {
      console.error("❌ ENTRY POINT 2 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // ENTRY POINT 3: GoalDetail.jsx Goal/Milestone AI Proposal Accept
    // -------------------------------------------------------------
    console.log("\n--- ENTRY POINT 3: AI Proposal Accept Flow ---");
    try {
      const ep3Res = await client.query(`
        INSERT INTO public.tasks (
          org_id, goal_id, milestone_id, title, description, weight,
          deadline, assignee_id, assigner_id, reviewer_id, approval_status, ai_generated, completed
        )
        VALUES ($1, $2, $3, 'EP3: AI Proposed Task', 'Auto-generated proposal', 1, NULL, $4, $4, $4, 'not_required', true, false)
        RETURNING *
      `, [orgId, goalId, msId, userId]);

      console.log("✅ ENTRY POINT 3 SUCCESS: Inserted task ID:", ep3Res.rows[0].id);
      await client.query("DELETE FROM public.tasks WHERE id = $1", [ep3Res.rows[0].id]);
    } catch (err) {
      console.error("❌ ENTRY POINT 3 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // ENTRY POINT 4: Task Creation on Goal WITHOUT Milestones
    // -------------------------------------------------------------
    console.log("\n--- ENTRY POINT 4: Task Creation when milestone_id IS NULL ---");
    try {
      const ep4Res = await client.query(`
        INSERT INTO public.tasks (
          org_id, goal_id, milestone_id, title, description, weight,
          deadline, assignee_id, assigner_id, reviewer_id, approval_status, blocked_by, completed
        )
        VALUES ($1, $2, NULL, 'EP4: Task Without Milestone', 'No milestone goal task', 1, NULL, $4, $4, $4, 'not_required', NULL, false)
        RETURNING *
      `, [orgId, goalId, userId]);

      console.log("✅ ENTRY POINT 4 SUCCESS: Inserted task ID (with milestone_id NULL):", ep4Res.rows[0].id);
      await client.query("DELETE FROM public.tasks WHERE id = $1", [ep4Res.rows[0].id]);
    } catch (err) {
      console.error("❌ ENTRY POINT 4 FAILED (milestone_id NULL):", err.message);
    }

    // -------------------------------------------------------------
    // ENTRY POINT 5: Task Creation with Empty String blocked_by ""
    // -------------------------------------------------------------
    console.log("\n--- ENTRY POINT 5: Task Creation with blocked_by = '' (Empty String) ---");
    try {
      const ep5Res = await client.query(`
        INSERT INTO public.tasks (
          org_id, goal_id, milestone_id, title, description, weight,
          deadline, assignee_id, assigner_id, reviewer_id, approval_status, blocked_by, completed
        )
        VALUES ($1, $2, $3, 'EP5: Empty String BlockedBy', 'Blocked by empty string', 1, NULL, $4, $4, $4, 'not_required', '', false)
        RETURNING *
      `, [orgId, goalId, msId, userId]);

      console.log("✅ ENTRY POINT 5 SUCCESS:", ep5Res.rows[0].id);
      await client.query("DELETE FROM public.tasks WHERE id = $1", [ep5Res.rows[0].id]);
    } catch (err) {
      console.error("❌ ENTRY POINT 5 FAILED (Empty string blocked_by):", err.message);
    }

  } catch (err) {
    console.error("❌ General Error:", err);
  } finally {
    await client.end();
  }
}

testAllTaskEntryPoints();
