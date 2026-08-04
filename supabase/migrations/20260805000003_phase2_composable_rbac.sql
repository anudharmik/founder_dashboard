-- FounderOS Phase 2: Composable, Per-Scope RBAC Migration

-- 1. SCOPED PERMISSIONS TABLE
create table if not exists public.scoped_permissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  scope_type text not null check (scope_type in ('department', 'project')),
  scope_id uuid not null,
  role org_role not null,
  granted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (user_id, scope_type, scope_id)
);

create index if not exists idx_scoped_permissions_org_id on public.scoped_permissions(org_id);
create index if not exists idx_scoped_permissions_user_id on public.scoped_permissions(user_id);
create index if not exists idx_scoped_permissions_scope on public.scoped_permissions(scope_type, scope_id);

alter table public.scoped_permissions enable row level security;

drop policy if exists "Scoped permissions visible to org members" on public.scoped_permissions;
create policy "Scoped permissions visible to org members" on public.scoped_permissions
  for select using (public.is_org_member(org_id));

drop policy if exists "Owners and managers can manage scoped permissions" on public.scoped_permissions;
create policy "Owners and managers can manage scoped permissions" on public.scoped_permissions
  for all using (public.get_org_role(org_id) in ('owner', 'manager'));


-- 2. EFFECTIVE ROLE RESOLUTION FUNCTION
create or replace function public.has_effective_role(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_required_role org_role
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_role org_role;
  v_effective_rank integer := 0;
  v_required_rank integer := 0;
  v_dept_id uuid;
  v_project_id uuid;
  v_goal_id uuid;
  v_milestone_id uuid;
  v_scoped_rank integer := 0;
begin
  if p_user_id is null or p_entity_id is null then
    return false;
  end if;

  -- Rank helper: owner=4, manager=3, employee=2, guest=1
  v_required_rank := case p_required_role
    when 'owner' then 4
    when 'manager' then 3
    when 'employee' then 2
    when 'guest' then 1
    else 0
  end;

  -- 1. Determine entity's org_id and parent scope IDs
  if p_entity_type = 'organization' then
    v_org_id := p_entity_id;
  elsif p_entity_type = 'department' then
    select org_id into v_org_id from public.departments where id = p_entity_id;
    v_dept_id := p_entity_id;
  elsif p_entity_type = 'project' then
    select org_id, department_id into v_org_id, v_dept_id from public.projects where id = p_entity_id;
    v_project_id := p_entity_id;
  elsif p_entity_type = 'goal' then
    select g.org_id, g.project_id, p.department_id into v_org_id, v_project_id, v_dept_id
    from public.goals g
    left join public.projects p on p.id = g.project_id
    where g.id = p_entity_id;
  elsif p_entity_type = 'milestone' then
    select m.org_id, g.project_id, p.department_id into v_org_id, v_project_id, v_dept_id
    from public.milestones m
    left join public.goals g on g.id = m.goal_id
    left join public.projects p on p.id = g.project_id
    where m.id = p_entity_id;
  elsif p_entity_type = 'task' then
    select t.org_id, g.project_id, p.department_id into v_org_id, v_project_id, v_dept_id
    from public.tasks t
    left join public.goals g on g.id = t.goal_id
    left join public.projects p on p.id = g.project_id
    where t.id = p_entity_id;
  end if;

  if v_org_id is null then
    return false;
  end if;

  -- 2. Get user's org-wide role
  select role into v_org_role
  from public.org_members
  where org_id = v_org_id and user_id = p_user_id;

  v_effective_rank := case v_org_role
    when 'owner' then 4
    when 'manager' then 3
    when 'employee' then 2
    when 'guest' then 1
    else 0
  end;

  -- If org-wide role already satisfies required role, return true
  if v_effective_rank >= v_required_rank then
    return true;
  end if;

  -- 3. Check matching scoped_permissions grants
  select coalesce(max(case role
    when 'owner' then 4
    when 'manager' then 3
    when 'employee' then 2
    when 'guest' then 1
    else 0
  end), 0) into v_scoped_rank
  from public.scoped_permissions
  where org_id = v_org_id
    and user_id = p_user_id
    and (
      (scope_type = 'project' and scope_id = v_project_id)
      or (scope_type = 'department' and scope_id = v_dept_id)
    );

  if v_scoped_rank > v_effective_rank then
    v_effective_rank := v_scoped_rank;
  end if;

  return v_effective_rank >= v_required_rank;
end;
$$;


-- 3. REWRITE RLS WRITE POLICIES TO USE has_effective_role

-- PROJECTS
drop policy if exists "Owners or managers can insert projects" on public.projects;
create policy "Owners or managers can insert projects" on public.projects
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners or managers can update projects" on public.projects;
create policy "Owners or managers can update projects" on public.projects
  for update using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

drop policy if exists "Owners or managers can delete projects" on public.projects;
create policy "Owners or managers can delete projects" on public.projects
  for delete using (public.has_effective_role(auth.uid(), 'project', id, 'manager'));

-- GOALS
drop policy if exists "Owners or managers can insert goals" on public.goals;
create policy "Owners or managers can insert goals" on public.goals
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or public.has_effective_role(auth.uid(), 'project', project_id, 'manager')
  );

drop policy if exists "Owners or managers can update goals" on public.goals;
create policy "Owners or managers can update goals" on public.goals
  for update using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

drop policy if exists "Owners or managers can delete goals" on public.goals;
create policy "Owners or managers can delete goals" on public.goals
  for delete using (public.has_effective_role(auth.uid(), 'goal', id, 'manager'));

-- MILESTONES
drop policy if exists "Owners or managers can insert milestones" on public.milestones;
create policy "Owners or managers can insert milestones" on public.milestones
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or public.has_effective_role(auth.uid(), 'goal', goal_id, 'manager')
  );

drop policy if exists "Owners or managers can update milestones" on public.milestones;
create policy "Owners or managers can update milestones" on public.milestones
  for update using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

drop policy if exists "Owners or managers can delete milestones" on public.milestones;
create policy "Owners or managers can delete milestones" on public.milestones
  for delete using (public.has_effective_role(auth.uid(), 'milestone', id, 'manager'));

-- TASKS
drop policy if exists "Owners or managers can insert tasks" on public.tasks;
create policy "Owners or managers can insert tasks" on public.tasks
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or public.has_effective_role(auth.uid(), 'goal', goal_id, 'manager')
    or (public.get_org_role(org_id) = 'employee' and exists (
      select 1 from public.tasks t where t.goal_id = tasks.goal_id and t.assigned_to = auth.uid()
    ))
  );

drop policy if exists "Owners managers or assignees can update tasks" on public.tasks;
create policy "Owners managers or assignees can update tasks" on public.tasks
  for update using (
    public.has_effective_role(auth.uid(), 'task', id, 'manager')
    or assigned_to = auth.uid()
    or reviewed_by = auth.uid()
  );

drop policy if exists "Owners or managers can delete tasks" on public.tasks;
create policy "Owners or managers can delete tasks" on public.tasks
  for delete using (public.has_effective_role(auth.uid(), 'task', id, 'manager'));
