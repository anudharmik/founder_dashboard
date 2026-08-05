-- Migration: Updated RLS Policies for org_invites
-- Allows both owners and managers of an organization to view, insert, update, and revoke invitations

-- Drop existing policies if present
drop policy if exists "Owners can view org invites" on public.org_invites;
drop policy if exists "Owners and managers can view org invites" on public.org_invites;
create policy "Owners and managers can view org invites" on public.org_invites
  for select using (
    public.get_org_role(org_id) in ('owner', 'manager') or lower(email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "Owners can insert org invites" on public.org_invites;
drop policy if exists "Owners and managers can insert org invites" on public.org_invites;
create policy "Owners and managers can insert org invites" on public.org_invites
  for insert with check (
    public.get_org_role(org_id) in ('owner', 'manager')
  );

drop policy if exists "Owners can update org invites" on public.org_invites;
drop policy if exists "Owners and managers can update org invites" on public.org_invites;
create policy "Owners and managers can update org invites" on public.org_invites
  for update using (
    public.get_org_role(org_id) in ('owner', 'manager')
  );

drop policy if exists "Owners can delete org invites" on public.org_invites;
drop policy if exists "Owners and managers can delete org invites" on public.org_invites;
create policy "Owners and managers can delete org invites" on public.org_invites
  for delete using (
    public.get_org_role(org_id) in ('owner', 'manager')
  );
