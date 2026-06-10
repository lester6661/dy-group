-- DY Group V1 - Phase 4 System Settings
-- Adds super_admin policies for managing existing settings tables.

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

drop policy if exists "Super admins can read all regions" on public.regions;
create policy "Super admins can read all regions"
on public.regions for select
to authenticated
using (public.current_user_is_super_admin());

drop policy if exists "Super admins can create regions" on public.regions;
create policy "Super admins can create regions"
on public.regions for insert
to authenticated
with check (public.current_user_is_super_admin());

drop policy if exists "Super admins can update regions" on public.regions;
create policy "Super admins can update regions"
on public.regions for update
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

drop policy if exists "Super admins can read all employment types" on public.employment_types;
create policy "Super admins can read all employment types"
on public.employment_types for select
to authenticated
using (public.current_user_is_super_admin());

drop policy if exists "Super admins can create employment types" on public.employment_types;
create policy "Super admins can create employment types"
on public.employment_types for insert
to authenticated
with check (public.current_user_is_super_admin());

drop policy if exists "Super admins can update employment types" on public.employment_types;
create policy "Super admins can update employment types"
on public.employment_types for update
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

drop policy if exists "Super admins can read all job titles" on public.job_titles;
create policy "Super admins can read all job titles"
on public.job_titles for select
to authenticated
using (public.current_user_is_super_admin());

drop policy if exists "Super admins can create job titles" on public.job_titles;
create policy "Super admins can create job titles"
on public.job_titles for insert
to authenticated
with check (public.current_user_is_super_admin());

drop policy if exists "Super admins can update job titles" on public.job_titles;
create policy "Super admins can update job titles"
on public.job_titles for update
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());
