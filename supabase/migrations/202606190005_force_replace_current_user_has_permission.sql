begin;

drop policy if exists "Registration viewers can read scoped pending profiles" on public.profiles;
drop function if exists public.current_user_has_permission(text, text);

create or replace function public.current_user_has_permission(
  p_permission_key text,
  p_action text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  viewer_profile public.profiles;
  viewer_employee public.employees;
begin
  if p_action is null or p_action not in ('view', 'use') then
    raise exception 'Unsupported permission action: %', p_action
      using errcode = '22023';
  end if;

  select p.*
  into viewer_profile
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if viewer_profile.id is null then
    return false;
  end if;

  if viewer_profile.role = 'super_admin' then
    return true;
  end if;

  if viewer_profile.status <> 'approved' then
    return false;
  end if;

  select e.*
  into viewer_employee
  from public.employees e
  where e.profile_id = viewer_profile.id
    and e.deleted_at is null
  limit 1;

  if viewer_employee.id is null then
    return false;
  end if;

  return exists (
    with recursive applicable_permissions as (
      select pi.permission_key, pi.parent_key
      from public.permission_items pi
      where pi.permission_key = p_permission_key
        and pi.is_active = true

      union all

      select parent.permission_key, parent.parent_key
      from public.permission_items parent
      join applicable_permissions child
        on child.parent_key = parent.permission_key
      where parent.is_active = true
    )
    select 1
    from applicable_permissions ap
    where exists (
      select 1
      from public.job_title_permission_templates jtpt
      where jtpt.job_title_id = viewer_employee.job_title_id
        and jtpt.permission_key = ap.permission_key
        and case
          when p_action = 'view' then jtpt.can_view
          else jtpt.can_view and jtpt.can_use
        end
    )
    or exists (
      select 1
      from public.employee_special_permissions esp
      join public.special_permission_template_items spti
        on spti.special_permission_template_id = esp.special_permission_template_id
      where esp.employee_id = viewer_employee.id
        and esp.is_enabled = true
        and spti.permission_key = ap.permission_key
        and case
          when p_action = 'view' then esp.can_view and spti.can_view
          else esp.can_view and esp.can_use and spti.can_view and spti.can_use
        end
    )
    or exists (
      select 1
      from public.employee_permission_overrides epo
      where epo.employee_id = viewer_employee.id
        and epo.permission_key = ap.permission_key
        and case
          when p_action = 'view' then epo.can_view
          else epo.can_view and epo.can_use
        end
    )
  );
end;
$$;

revoke all on function public.current_user_has_permission(text, text) from public;
grant execute on function public.current_user_has_permission(text, text) to authenticated, service_role;

create policy "Registration viewers can read scoped pending profiles"
on public.profiles
for select
to authenticated
using (
  profiles.status = 'pending_review'
  and public.current_user_has_permission('registration-review', 'view')
  and public.current_user_can_access_region(profiles.region_id)
);

commit;
