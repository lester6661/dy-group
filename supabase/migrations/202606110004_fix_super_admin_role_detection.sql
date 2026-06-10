create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where status = 'approved'
      and role = 'super_admin'
      and (
        id = auth.uid()
        or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$$;

drop policy if exists "Super admins can update employees" on public.employees;

create policy "Super admins can update employees"
on public.employees
for update
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create or replace function public.prevent_restricted_employee_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.app_role;
begin
  if public.current_user_is_super_admin() then
    return new;
  end if;

  select role into current_role
  from public.profiles
  where id = auth.uid()
    and status = 'approved';

  if current_role is null then
    raise exception '无权修改员工资料。';
  end if;

  if new.require_attendance is distinct from old.require_attendance then
    raise exception '只有 Super Admin 可以修改是否需要考勤。';
  end if;

  return new;
end;
$$;
