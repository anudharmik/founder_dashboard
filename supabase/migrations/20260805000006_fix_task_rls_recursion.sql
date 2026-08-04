-- FounderOS Phase 2: Complete RLS Policy Recursion Cleanup & Security Fix (42P17)

-- 1. PRIVILEGED HELPER FOR EMPLOYEE TASK CHECK (Bypasses RLS loop)
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


-- 2. DROP ALL LEGACY / DUPLICATE POLICIES ON TASKS, GOALS, MILESTONES, PROJECTS
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


-- 3. RE-CREATE CLEAN RLS WRITE POLICIES

-- PROJECTS
create policy "Owners or managers can insert projects" on public.projects
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

create policy "Owners or managers can update projects" on public.projects
  for update using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

create policy "Owners or managers can delete projects" on public.projects
  for delete using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

-- GOALS
create policy "Owners or managers can insert goals" on public.goals
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or public.has_effective_role(auth.uid(), 'project', project_id, 'manager')
  );

create policy "Owners or managers can update goals" on public.goals
  for update using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

create policy "Owners or managers can delete goals" on public.goals
  for delete using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

-- MILESTONES
create policy "Owners or managers can insert milestones" on public.milestones
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or public.has_effective_role(auth.uid(), 'goal', goal_id, 'manager')
  );

create policy "Owners or managers can update milestones" on public.milestones
  for update using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

create policy "Owners or managers can delete milestones" on public.milestones
  for delete using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

-- TASKS
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
