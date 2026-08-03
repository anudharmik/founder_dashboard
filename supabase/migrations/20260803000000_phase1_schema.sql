-- FounderOS Phase 1 Schema Migration
-- Created: 2026-08-03

-- Clean up any legacy / pre-existing tables if resetting schema
drop table if exists guest_project_access cascade;
drop table if exists org_billing cascade;
drop table if exists reminders cascade;
drop table if exists activity_log cascade;
drop table if exists task_comments cascade;
drop table if exists tasks cascade;
drop table if exists goals cascade;
drop table if exists project_teams cascade;
drop table if exists projects cascade;
drop table if exists team_members cascade;
drop table if exists teams cascade;
drop table if exists org_members cascade;
drop table if exists departments cascade;
drop table if exists organizations cascade;

-- 1. ORGANIZATIONS
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- AUTOMATIC ORG OWNER SCAFFOLDING TRIGGER
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.org_members (org_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict (org_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_organization_created on organizations;
create trigger on_organization_created
  after insert on organizations
  for each row execute function public.handle_new_organization();

-- 2. ENUMS & DEPARTMENTS
do $$ begin
  create type org_role as enum ('owner', 'manager', 'employee', 'guest');
exception
  when duplicate_object then null;
end $$;

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- 3. ORG_MEMBERS
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role org_role not null default 'employee',
  department_id uuid references departments(id),
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- 4. TEAMS & TEAM_MEMBERS
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists team_members (
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (team_id, user_id)
);

-- 5. PROJECTS & PROJECT_TEAMS
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  department_id uuid references departments(id) not null,
  title text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists project_teams (
  project_id uuid references projects(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  primary key (project_id, team_id)
);

-- 6. GOALS
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  weight numeric default 1,
  progress_computed numeric default 0,
  progress_override numeric,
  progress_override_by uuid references auth.users(id),
  progress_override_at timestamptz,
  progress_override_previous numeric,
  status text default 'active',
  risk_flag text default 'none',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 7. TASKS
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade not null,
  title text not null,
  description text,
  weight numeric default 1,
  completed boolean default false,
  completed_at timestamptz,
  deadline date,
  assignee_id uuid references auth.users(id),
  assigner_id uuid references auth.users(id),
  reviewer_id uuid references auth.users(id),
  approval_status text default 'not_required',
  blocked_by uuid references tasks(id),
  overdue_email_sent boolean default false,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

-- 8. TASK_COMMENTS
create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  org_id uuid references organizations(id) not null,
  author_id uuid references auth.users(id) not null,
  body text not null,
  created_at timestamptz default now()
);

-- 9. ACTIVITY_LOG
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references auth.users(id),
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 10. REMINDERS
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  remind_at timestamptz not null,
  sent boolean default false,
  created_at timestamptz default now()
);

-- 11. ORG_BILLING
create table if not exists org_billing (
  org_id uuid primary key references organizations(id) on delete cascade,
  plan text default 'pilot',
  status text default 'n/a'
);

-- 12. GUEST_PROJECT_ACCESS
create table if not exists guest_project_access (
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade not null,
  primary key (user_id, project_id)
);

-- HELPER FUNCTION FOR ROLE CHECKS IN RLS
create or replace function public.get_org_role(p_org_id uuid)
returns org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

-- ENABLE ROW LEVEL SECURITY ON ALL 13 NEW TABLES
alter table organizations enable row level security;
alter table departments enable row level security;
alter table org_members enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table projects enable row level security;
alter table project_teams enable row level security;
alter table goals enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table activity_log enable row level security;
alter table reminders enable row level security;
alter table org_billing enable row level security;
alter table guest_project_access enable row level security;

-- RLS POLICIES

-- ORGANIZATIONS
drop policy if exists "Organizations visible to members or creator" on organizations;
drop policy if exists "Organizations visible to members" on organizations;
create policy "Organizations visible to members or creator" on organizations
  for select using (
    created_by = auth.uid()
    or exists (select 1 from org_members where org_members.org_id = organizations.id and org_members.user_id = auth.uid())
  );

drop policy if exists "Authenticated users can create organizations" on organizations;
create policy "Authenticated users can create organizations" on organizations
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Owners can update organization" on organizations;
create policy "Owners can update organization" on organizations
  for update using (public.get_org_role(id) = 'owner' or created_by = auth.uid());

-- ORG_MEMBERS
drop policy if exists "Org members visible to members of same org" on org_members;
create policy "Org members visible to members of same org" on org_members
  for select using (
    user_id = auth.uid() or public.is_org_member(org_id)
  );

drop policy if exists "Owners or self can insert org_members" on org_members;
create policy "Owners or self can insert org_members" on org_members
  for insert with check (
    user_id = auth.uid() or public.get_org_role(org_id) = 'owner'
  );

drop policy if exists "Owners can update org_members" on org_members;
create policy "Owners can update org_members" on org_members
  for update using (public.get_org_role(org_id) = 'owner');

drop policy if exists "Owners can delete org_members" on org_members;
create policy "Owners can delete org_members" on org_members
  for delete using (public.get_org_role(org_id) = 'owner');

-- DEPARTMENTS
drop policy if exists "Departments visible to org members" on departments;
create policy "Departments visible to org members" on departments
  for select using (public.is_org_member(org_id));

drop policy if exists "Owners can insert departments" on departments;
create policy "Owners can insert departments" on departments
  for insert with check (public.get_org_role(org_id) = 'owner');

drop policy if exists "Owners can update departments" on departments;
create policy "Owners can update departments" on departments
  for update using (public.get_org_role(org_id) = 'owner');

drop policy if exists "Owners can delete departments" on departments;
create policy "Owners can delete departments" on departments
  for delete using (public.get_org_role(org_id) = 'owner');

-- TEAMS
drop policy if exists "Teams visible to org members" on teams;
create policy "Teams visible to org members" on teams
  for select using (public.is_org_member(org_id));

drop policy if exists "Owners and managers can insert teams" on teams;
create policy "Owners and managers can insert teams" on teams
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can update teams" on teams;
create policy "Owners and managers can update teams" on teams
  for update using (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can delete teams" on teams;
create policy "Owners and managers can delete teams" on teams
  for delete using (public.get_org_role(org_id) in ('owner', 'manager'));

-- TEAM_MEMBERS
drop policy if exists "Team members visible to org members" on team_members;
create policy "Team members visible to org members" on team_members
  for select using (
    exists (select 1 from teams where teams.id = team_members.team_id and public.is_org_member(teams.org_id))
  );

drop policy if exists "Owners and managers can manage team_members" on team_members;
create policy "Owners and managers can manage team_members" on team_members
  for all using (
    exists (select 1 from teams where teams.id = team_members.team_id and public.get_org_role(teams.org_id) in ('owner', 'manager'))
  );

-- PROJECTS
drop policy if exists "Projects visible to org members and invited guests" on projects;
create policy "Projects visible to org members and invited guests" on projects
  for select using (
    public.is_org_member(org_id) or exists (
      select 1 from guest_project_access where guest_project_access.project_id = projects.id and guest_project_access.user_id = auth.uid()
    )
  );

drop policy if exists "Owners and managers can insert projects" on projects;
create policy "Owners and managers can insert projects" on projects
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can update projects" on projects;
create policy "Owners and managers can update projects" on projects
  for update using (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can delete projects" on projects;
create policy "Owners and managers can delete projects" on projects
  for delete using (public.get_org_role(org_id) in ('owner', 'manager'));

-- PROJECT_TEAMS
drop policy if exists "Project teams visible to org members" on project_teams;
create policy "Project teams visible to org members" on project_teams
  for select using (
    exists (select 1 from projects where projects.id = project_teams.project_id and public.is_org_member(projects.org_id))
  );

drop policy if exists "Owners and managers can manage project_teams" on project_teams;
create policy "Owners and managers can manage project_teams" on project_teams
  for all using (
    exists (select 1 from projects where projects.id = project_teams.project_id and public.get_org_role(projects.org_id) in ('owner', 'manager'))
  );

-- GOALS
drop policy if exists "Goals visible to org members" on goals;
drop policy if exists "Goals visible to org members and invited guests" on goals;
create policy "Goals visible to org members and invited guests" on goals
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from guest_project_access gpa
      where gpa.project_id = goals.project_id and gpa.user_id = auth.uid()
    )
  );

drop policy if exists "Owners and managers can insert goals" on goals;
create policy "Owners and managers can insert goals" on goals
  for insert with check (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can update goals" on goals;
create policy "Owners and managers can update goals" on goals
  for update using (public.get_org_role(org_id) in ('owner', 'manager'));

drop policy if exists "Owners and managers can delete goals" on goals;
create policy "Owners and managers can delete goals" on goals
  for delete using (public.get_org_role(org_id) in ('owner', 'manager'));

-- TASKS
drop policy if exists "Tasks visible to org members" on tasks;
drop policy if exists "Tasks visible to org members and invited guests" on tasks;
create policy "Tasks visible to org members and invited guests" on tasks
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from goals g
      join guest_project_access gpa on gpa.project_id = g.project_id
      where g.id = tasks.goal_id and gpa.user_id = auth.uid()
    )
  );

drop policy if exists "Owners managers and assigned employees can insert tasks" on tasks;
create policy "Owners managers and assigned employees can insert tasks" on tasks
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
    or (
      public.get_org_role(org_id) = 'employee'
      and assignee_id = auth.uid()
      and exists (
        select 1 from tasks existing_t
        where existing_t.goal_id = tasks.goal_id
        and existing_t.assignee_id = auth.uid()
      )
    )
  );

drop policy if exists "Owners managers and assignees can update tasks" on tasks;
create policy "Owners managers and assignees can update tasks" on tasks
  for update using (
    public.get_org_role(org_id) in ('owner', 'manager')
    or (
      public.is_org_member(org_id)
      and assignee_id = auth.uid()
    )
  );

drop policy if exists "Owners and managers can delete tasks" on tasks;
create policy "Owners and managers can delete tasks" on tasks
  for delete using (public.get_org_role(org_id) in ('owner', 'manager'));

-- TASK_COMMENTS HELPER & POLICIES
create or replace function public.can_user_comment_on_task(p_task_id uuid, p_user_id uuid, p_org_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.org_members om where om.org_id = p_org_id and om.user_id = p_user_id
  ) or exists (
    select 1 from public.tasks t
    join public.goals g on g.id = t.goal_id
    join public.guest_project_access gpa on gpa.project_id = g.project_id
    where t.id = p_task_id and gpa.user_id = p_user_id
  );
$$;

drop policy if exists "Task comments visible to org members and invited guests" on task_comments;
create policy "Task comments visible to org members and invited guests" on task_comments
  for select using (
    public.can_user_comment_on_task(task_id, auth.uid(), org_id)
  );

drop policy if exists "Org members and invited guests can comment" on task_comments;
create policy "Org members and invited guests can comment" on task_comments
  for insert with check (
    author_id = auth.uid()
    and public.can_user_comment_on_task(task_id, auth.uid(), org_id)
  );

-- ACTIVITY_LOG
drop policy if exists "Activity log visible to org members" on activity_log;
create policy "Activity log visible to org members" on activity_log
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from guest_project_access gpa
      where gpa.user_id = auth.uid()
    )
  );

drop policy if exists "Org members can append to activity log" on activity_log;
create policy "Org members can append to activity log" on activity_log
  for insert with check (
    public.is_org_member(org_id)
    or exists (
      select 1 from guest_project_access gpa
      where gpa.user_id = auth.uid()
    )
  );

-- REMINDERS
drop policy if exists "Users can manage their own reminders" on reminders;
create policy "Users can manage their own reminders" on reminders
  for all using (user_id = auth.uid() and public.is_org_member(org_id));

-- ORG_BILLING
drop policy if exists "Owners can view org billing" on org_billing;
create policy "Owners can view org billing" on org_billing
  for select using (public.get_org_role(org_id) = 'owner');

drop policy if exists "Owners can update org billing" on org_billing;
create policy "Owners can update org billing" on org_billing
  for update using (public.get_org_role(org_id) = 'owner');

-- GUEST_PROJECT_ACCESS
drop policy if exists "Guest access visible to owners managers or self" on guest_project_access;
create policy "Guest access visible to owners managers or self" on guest_project_access
  for select using (
    user_id = auth.uid() or public.get_org_role(org_id) in ('owner', 'manager')
  );

drop policy if exists "Owners can manage guest access" on guest_project_access;
create policy "Owners can manage guest access" on guest_project_access
  for all using (
    public.get_org_role(org_id) = 'owner'
  );
