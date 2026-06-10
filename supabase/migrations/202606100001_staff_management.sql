-- DY Group Production - Phase 2 Staff Management
-- Adds soft delete support and RLS policies required by the employees module.

alter table public.employees
add column if not exists deleted_at timestamptz;

create index if not exists employees_deleted_at_idx on public.employees(deleted_at);

create or replace function public.current_user_is_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'approved'
  );
$$;

create or replace function public.prevent_employee_soft_delete_without_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and not public.current_user_is_super_admin() then
    raise exception 'Only super_admin can delete employees.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_employee_soft_delete_without_super_admin on public.employees;
create trigger prevent_employee_soft_delete_without_super_admin
before update on public.employees
for each row execute function public.prevent_employee_soft_delete_without_super_admin();

create or replace function public.soft_delete_employee(employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super_admin can delete employees.';
  end if;

  update public.employees
  set deleted_at = now(),
      status = 'inactive',
      updated_at = now()
  where id = employee_id
    and deleted_at is null;
end;
$$;

drop policy if exists "Approved users can read employees" on public.employees;
create policy "Approved users can read employees"
on public.employees for select
to authenticated
using (public.current_user_is_approved() and deleted_at is null);

drop policy if exists "Approved users can create employees" on public.employees;
create policy "Approved users can create employees"
on public.employees for insert
to authenticated
with check (public.current_user_is_approved() and deleted_at is null);

drop policy if exists "Approved users can update employees" on public.employees;
create policy "Approved users can update employees"
on public.employees for update
to authenticated
using (public.current_user_is_approved() and deleted_at is null)
with check (public.current_user_is_approved() and deleted_at is null);
