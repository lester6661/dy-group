-- Default an approved employee's region scope to their assigned region.
-- employee_permission_regions adds optional cross-region access.

create or replace function public.current_user_authorized_region_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id
  from public.regions r
  where exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  )

  union

  select e.region_id
  from public.profiles p
  join public.employees e
    on e.profile_id = p.id
    and e.deleted_at is null
  where p.id = auth.uid()
    and p.status = 'approved'
    and p.role <> 'super_admin'
    and e.region_id is not null

  union

  select epr.region_id
  from public.profiles p
  join public.employees e
    on e.profile_id = p.id
    and e.deleted_at is null
  join public.employee_permission_regions epr
    on epr.employee_id = e.id
  where p.id = auth.uid()
    and p.status = 'approved'
    and p.role <> 'super_admin'
$$;
