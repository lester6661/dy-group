-- DY Group V1 - Phase 7 Attendance Management
-- Adds HR/admin/super_admin read access for attendance management.

create or replace function public.current_user_can_manage_attendance()
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
      and role in ('super_admin', 'admin', 'hr')
      and status = 'approved'
  );
$$;

drop policy if exists "Attendance managers can read all attendance records" on public.attendance_records;
create policy "Attendance managers can read all attendance records"
on public.attendance_records for select
to authenticated
using (public.current_user_can_manage_attendance());

drop policy if exists "Attendance managers can read all leave requests" on public.leave_requests;
create policy "Attendance managers can read all leave requests"
on public.leave_requests for select
to authenticated
using (public.current_user_can_manage_attendance());
