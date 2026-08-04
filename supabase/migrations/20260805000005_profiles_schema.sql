-- FounderOS User Profiles Migration (Org-Scoped RLS)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  age integer check (age > 0 and age < 120),
  gender text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_id on public.profiles(id);

alter table public.profiles enable row level security;

-- SELECT: Only allow users who share at least one organization together (or viewing own profile)
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Org members can view shared profiles" on public.profiles;

create policy "Org members can view shared profiles" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.org_members m1
      join public.org_members m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid()
      and m2.user_id = public.profiles.id
    )
  );

-- INSERT: Users can insert their own profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- UPDATE: Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
