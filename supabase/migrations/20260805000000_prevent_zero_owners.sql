-- Migration: Prevent zero-owner organizations
-- Function and trigger to ensure an organization never ends up with 0 members holding role = 'owner'

create or replace function public.prevent_last_owner_demotion_or_deletion()
returns trigger
language plpgsql
security definer
as $$
declare
  current_owner_count integer;
begin
  -- Scenario 1: UPDATE where an owner is being demoted to non-owner role
  if (TG_OP = 'UPDATE') then
    if (OLD.role = 'owner' and NEW.role != 'owner') then
      select count(*) into current_owner_count
      from public.org_members
      where org_id = OLD.org_id and role = 'owner' and id != OLD.id;

      if (current_owner_count = 0) then
        raise exception 'Cannot demote the sole owner of an organization. Promote another member to Owner first.';
      end if;
    end if;
  end if;

  -- Scenario 2: DELETE where an owner member record is being deleted
  if (TG_OP = 'DELETE') then
    if (OLD.role = 'owner') then
      -- Check if the parent organization still exists (to allow cascading delete on org deletion)
      if exists (select 1 from public.organizations where id = OLD.org_id) then
        select count(*) into current_owner_count
        from public.org_members
        where org_id = OLD.org_id and role = 'owner' and id != OLD.id;

        if (current_owner_count = 0) then
          raise exception 'Cannot remove the sole owner of an organization. Promote another member to Owner first.';
        end if;
      end if;
    end if;
  end if;

  if (TG_OP = 'DELETE') then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

drop trigger if exists trg_prevent_last_owner_demotion_or_deletion on public.org_members;
create trigger trg_prevent_last_owner_demotion_or_deletion
  before update or delete on public.org_members
  for each row
  execute function public.prevent_last_owner_demotion_or_deletion();
