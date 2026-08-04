import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testRecursionFix() {
  console.log("=================================================");
  console.log("APPLYING & TESTING TASK RLS RECURSION FIX (42P17)");
  console.log("=================================================\n");

  try {
    await client.connect();

    // Apply complete cleanup & fix
    console.log("Applying Migration 20260805000006_fix_task_rls_recursion.sql...");
    await client.query(`
      create or replace function public.user_has_task_on_goal(p_user_id uuid, p_goal_id uuid)
      returns boolean
      language plpgsql
      security definer
      set search_path = public
      as $$
      begin
        if p_user_id is null or p_goal_id is null then
          return false;
        end if;

        return exists (
          select 1 from public.tasks
          where goal_id = p_goal_id and assignee_id = p_user_id
        );
      end;
      $$;

      drop policy if exists "Owners managers and assigned employees can insert tasks" on public.tasks;
      drop policy if exists "Owners managers and assignees can update tasks" on public.tasks;
      drop policy if exists "Owners managers or assignees can update tasks" on public.tasks;
      drop policy if exists "Owners and managers can delete tasks" on public.tasks;
      drop policy if exists "Owners or managers can delete tasks" on public.tasks;
      drop policy if exists "Owners or managers can insert tasks" on public.tasks;

      drop policy if exists "Owners and managers can insert goals" on public.goals;
      drop policy if exists "Owners and managers can update goals" on public.goals;
      drop policy if exists "Owners and managers can delete goals" on public.goals;
      drop policy if exists "Owners or managers can delete goals" on public.goals;
      drop policy if exists "Owners or managers can insert goals" on public.goals;
      drop policy if exists "Owners or managers can update goals" on public.goals;

      drop policy if exists "Owners and managers can insert milestones" on public.milestones;
      drop policy if exists "Owners and managers can update milestones" on public.milestones;
      drop policy if exists "Owners and managers can delete milestones" on public.milestones;
      drop policy if exists "Owners or managers can delete milestones" on public.milestones;
      drop policy if exists "Owners or managers can insert milestones" on public.milestones;
      drop policy if exists "Owners or managers can update milestones" on public.milestones;

      drop policy if exists "Owners and managers can insert projects" on public.projects;
      drop policy if exists "Owners and managers can update projects" on public.projects;
      drop policy if exists "Owners and managers can delete projects" on public.projects;
      drop policy if exists "Owners or managers can delete projects" on public.projects;
      drop policy if exists "Owners or managers can insert projects" on public.projects;
      drop policy if exists "Owners or managers can update projects" on public.projects;

      create policy "Owners or managers can insert projects" on public.projects
        for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

      create policy "Owners or managers can update projects" on public.projects
        for update using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

      create policy "Owners or managers can delete projects" on public.projects
        for delete using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

      create policy "Owners or managers can insert goals" on public.goals
        for insert with check (
          public.get_org_role(org_id) in ('owner', 'manager')
          or public.has_effective_role(auth.uid(), 'project', project_id, 'manager')
        );

      create policy "Owners or managers can update goals" on public.goals
        for update using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

      create policy "Owners or managers can delete goals" on public.goals
        for delete using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

      create policy "Owners or managers can insert milestones" on public.milestones
        for insert with check (
          public.get_org_role(org_id) in ('owner', 'manager')
          or public.has_effective_role(auth.uid(), 'goal', goal_id, 'manager')
        );

      create policy "Owners or managers can update milestones" on public.milestones
        for update using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

      create policy "Owners or managers can delete milestones" on public.milestones
        for delete using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

      create policy "Owners or managers can insert tasks" on public.tasks
        for insert with check (
          public.get_org_role(org_id) in ('owner', 'manager')
          or public.has_effective_role(auth.uid(), 'goal', goal_id, 'manager')
          or (public.get_org_role(org_id) = 'employee' and public.user_has_task_on_goal(auth.uid(), goal_id))
        );

      create policy "Owners managers or assignees can update tasks" on public.tasks
        for update using (
          public.has_effective_role(auth.uid(), 'task', id, 'manager')
          or assignee_id = auth.uid()
          or reviewer_id = auth.uid()
        );

      create policy "Owners or managers can delete tasks" on public.tasks
        for delete using (public.has_effective_role(auth.uid(), 'task', id, 'manager'));
    `);
    console.log("Migration applied successfully.\n");

    // Fetch an org and goal ID
    const orgRes = await client.query("SELECT id FROM public.organizations LIMIT 1");
    const orgId = orgRes.rows[0].id;

    const goalRes = await client.query("SELECT id FROM public.goals WHERE org_id = $1 LIMIT 1", [orgId]);
    const goalId = goalRes.rows[0].id;

    const msRes = await client.query("SELECT id FROM public.milestones WHERE goal_id = $1 LIMIT 1", [goalId]);
    const msId = msRes.rows[0].id;

    // Fetch an employee user
    const empRes = await client.query("SELECT user_id FROM public.org_members WHERE org_id = $1 AND role = 'employee' LIMIT 1", [orgId]);
    let empUserId = empRes.rows[0]?.user_id;

    if (!empUserId) {
      const anyUserRes = await client.query("SELECT id FROM auth.users LIMIT 1");
      empUserId = anyUserRes.rows[0].id;
    }

    console.log(`Testing task insert as Employee User '${empUserId}' on Goal '${goalId}'...`);

    // Execute INSERT as employee using SET LOCAL ROLE simulation
    await client.query("BEGIN");
    await client.query(`SET LOCAL request.jwt.claims = '{"sub": "${empUserId}", "role": "authenticated"}'`);
    await client.query("SET LOCAL ROLE authenticated");

    try {
      const insRes = await client.query(`
        INSERT INTO public.tasks (org_id, goal_id, milestone_id, title, assignee_id, assigner_id, weight)
        VALUES ($1, $2, $3, 'Test Task Recursion Fix', $4, $4, 1)
        RETURNING id
      `, [orgId, goalId, msId, empUserId]);

      console.log("✅ SUCCESS: Inserted Task ID:", insRes.rows[0].id);
      await client.query("ROLLBACK");
      console.log("✅ RECURSION FIXED WITH ZERO ERRORS!");
    } catch (err) {
      console.error("❌ FAILED WITH ERROR:");
      console.error("Code:", err.code);
      console.error("Message:", err.message);
      await client.query("ROLLBACK");
    }

  } catch (err) {
    console.error("❌ Setup error:", err);
  } finally {
    await client.end();
  }
}

testRecursionFix();
