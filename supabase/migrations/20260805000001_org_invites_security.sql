-- Migration: Org Invites Table and Secure Acceptance Function
-- Enforces strict email matching: the authenticated user accepting the invite MUST match the invited email.

-- 1. Create org_invites table
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade not null,
  email text not null,
  role org_role not null default 'employee',
  invited_by uuid references auth.users(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz default now()
);

-- Index for fast lookup
create index if not exists idx_org_invites_token on public.org_invites(token);
create index if not exists idx_org_invites_email on public.org_invites(lower(email));

-- RLS Policies on org_invites
alter table public.org_invites enable row level security;

-- Owners can view, create, and revoke invites for their organization
drop policy if exists "Owners can view org invites" on public.org_invites;
create policy "Owners can view org invites" on public.org_invites
  for select using (
    public.get_org_role(org_id) = 'owner' or lower(email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "Owners can insert org invites" on public.org_invites;
create policy "Owners can insert org invites" on public.org_invites
  for insert with check (
    public.get_org_role(org_id) = 'owner'
  );

drop policy if exists "Owners can delete org invites" on public.org_invites;
create policy "Owners can delete org invites" on public.org_invites
  for delete using (
    public.get_org_role(org_id) = 'owner'
  );

-- 2. Secure Invite Acceptance Function
create or replace function public.accept_org_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_user_id uuid;
  v_user_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to accept an invitation.';
  end if;

  -- Extract current user's email from JWT claims
  v_user_email := lower(auth.jwt() ->> 'email');
  if v_user_email is null or v_user_email = '' then
    select lower(email) into v_user_email from auth.users where id = v_user_id;
  end if;

  -- Fetch pending invite
  select * into v_invite
  from public.org_invites
  where token = p_token and status = 'pending';

  if v_invite is null then
    raise exception 'Invalid, expired, or already used invitation token.';
  end if;

  -- STRICT SECURITY CHECK: Authenticated user's email MUST match invited email
  if lower(v_invite.email) != lower(v_user_email) then
    raise exception 'Email mismatch: This invitation was issued for %, but you are currently logged in as %. Please log in as % to accept.',
      v_invite.email, v_user_email, v_invite.email;
  end if;

  -- Insert or update org member record
  insert into public.org_members (org_id, user_id, role)
  values (v_invite.org_id, v_user_id, v_invite.role)
  on conflict (org_id, user_id)
  do update set role = excluded.role;

  -- Mark invite as accepted
  update public.org_invites
  set status = 'accepted'
  where id = v_invite.id;

  return jsonb_build_object(
    'success', true,
    'org_id', v_invite.org_id,
    'role', v_invite.role,
    'message', 'Successfully joined organization.'
  );
end;
$$;
