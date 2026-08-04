-- FounderOS Phase 2 Hierarchy Extension Migration
-- Adds milestones and subtasks tables, updates tasks table, and sets up RLS policies

-- 1. MILESTONES TABLE
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  goal_id uuid references public.goals(id) on delete cascade not null,
  title text not null,
  description text,
  weight numeric default 1 check (weight > 0),
  progress_computed numeric default 0 check (progress_computed >= 0 and progress_computed <= 100),
  progress_override numeric check (progress_override >= 0 and progress_override <= 100),
  progress_override_by uuid references auth.users(id),
  progress_override_at timestamptz,
  progress_override_previous numeric,
  risk_flag text default 'none' check (risk_flag in ('none', 'at_risk', 'overdue')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_milestones_org_id on public.milestones(org_id);
create index if not exists idx_milestones_goal_id on public.milestones(goal_id);

-- RLS for milestones
alter table public.milestones enable row level security;

drop policy if exists "Milestones visible to org members" on public.milestones;
create policy "Milestones visible to org members" on public.milestones
  for select using (public.is_org_member(org_id));

drop policy if exists "Owners or managers can insert milestones" on public.milestones;
create policy "Owners or managers can insert milestones" on public.milestones
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners or managers can update milestones" on public.milestones;
create policy "Owners or managers can update milestones" on public.milestones
  for update using (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners or managers can delete milestones" on public.milestones;
create policy "Owners or managers can delete milestones" on public.milestones
  for delete using (public.get_org_role(org_id) in ('owner', 'manager'));


-- 2. TASKS TABLE EXTENSION & MIGRATION FOR EXISTING ROWS
alter table public.tasks add column if not exists milestone_id uuid references public.milestones(id) on delete cascade;

-- Automated data migration: For any goal with direct tasks that lack a milestone_id, create a default milestone per goal and assign tasks to it
do $$
declare
  g record;
  m_id uuid;
begin
  for g in select distinct goal_id, org_id, title from public.tasks where milestone_id is null and goal_id is not null loop
    -- Create default milestone for goal
    insert into public.milestones (org_id, goal_id, title, description)
    values (g.org_id, g.goal_id, 'General Milestone', 'Auto-created milestone for existing tasks')
    returning id into m_id;

    -- Update tasks for this goal
    update public.tasks
    set milestone_id = m_id
    where goal_id = g.goal_id and milestone_id is null;
  end loop;
end $$;

create index if not exists idx_tasks_milestone_id on public.tasks(milestone_id);


-- 3. SUBTASKS TABLE
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  completed_at timestamptz,
  weight numeric default 1 check (weight > 0),
  created_at timestamptz default now()
);

create index if not exists idx_subtasks_org_id on public.subtasks(org_id);
create index if not exists idx_subtasks_task_id on public.subtasks(task_id);

-- RLS for subtasks
alter table public.subtasks enable row level security;

drop policy if exists "Subtasks visible to org members" on public.subtasks;
create policy "Subtasks visible to org members" on public.subtasks
  for select using (public.is_org_member(org_id));

drop policy if exists "Owners managers or task assignees/reviewers can manage subtasks" on public.subtasks;
create policy "Owners managers or task assignees/reviewers can manage subtasks" on public.subtasks
  for all using (
    public.get_org_role(org_id) in ('owner', 'manager')
    or exists (
      select 1 from public.tasks t
      where t.id = subtasks.task_id and (t.assignee_id = auth.uid() or t.reviewer_id = auth.uid() or t.assigner_id = auth.uid())
    )
  );
