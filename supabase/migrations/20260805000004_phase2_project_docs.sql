-- FounderOS Phase 2: Project Documentation Module Migration

-- 1. PROJECT_DOCS TABLE
create table if not exists public.project_docs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null default 'Untitled Document',
  content text default '',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_project_docs_org_id on public.project_docs(org_id);
create index if not exists idx_project_docs_project_id on public.project_docs(project_id);

alter table public.project_docs enable row level security;

-- SELECT Policy: Same visibility as project (org members can view docs of projects in their org)
drop policy if exists "Project docs visible to org members" on public.project_docs;
create policy "Project docs visible to org members" on public.project_docs
  for select using (public.is_org_member(org_id));

-- INSERT Policy: Uses has_effective_role for manager rights on parent project
drop policy if exists "Users with project manager role can insert docs" on public.project_docs;
create policy "Users with project manager role can insert docs" on public.project_docs
  for insert with check (public.has_effective_role(auth.uid(), 'project', project_id, 'manager'));

-- UPDATE Policy: Uses has_effective_role for manager rights on parent project
drop policy if exists "Users with project manager role can update docs" on public.project_docs;
create policy "Users with project manager role can update docs" on public.project_docs
  for update using (public.has_effective_role(auth.uid(), 'project', project_id, 'manager'));

-- DELETE Policy: Uses has_effective_role for manager rights on parent project
drop policy if exists "Users with project manager role can delete docs" on public.project_docs;
create policy "Users with project manager role can delete docs" on public.project_docs
  for delete using (public.has_effective_role(auth.uid(), 'project', project_id, 'manager'));


-- 2. PROJECT_DOC_EDITS TABLE (Version History Log)
create table if not exists public.project_doc_edits (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references public.project_docs(id) on delete cascade not null,
  editor_id uuid references auth.users(id) not null,
  edited_at timestamptz default now()
);

create index if not exists idx_project_doc_edits_doc_id on public.project_doc_edits(doc_id);

alter table public.project_doc_edits enable row level security;

drop policy if exists "Project doc edits visible to org members" on public.project_doc_edits;
create policy "Project doc edits visible to org members" on public.project_doc_edits
  for select using (
    exists (
      select 1 from public.project_docs d
      where d.id = project_doc_edits.doc_id and public.is_org_member(d.org_id)
    )
  );

drop policy if exists "Users with project manager role can insert doc edits" on public.project_doc_edits;
create policy "Users with project manager role can insert doc edits" on public.project_doc_edits
  for insert with check (
    exists (
      select 1 from public.project_docs d
      where d.id = project_doc_edits.doc_id and public.has_effective_role(auth.uid(), 'project', d.project_id, 'manager')
    )
  );
