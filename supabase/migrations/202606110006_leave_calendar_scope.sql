create or replace function public.get_leave_calendar(
  month_start date,
  month_end date,
  region_filter uuid default null
)
returns table (
  leave_request_id uuid,
  employee_id uuid,
  employee_name text,
  employee_code text,
  region_id uuid,
  region_code text,
  leave_type public.leave_type,
  start_date date,
  end_date date,
  leave_date date
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      p.id,
      p.status,
      p.role,
      p.can_view_all_regions,
      coalesce(p.region_id, viewer_employee.region_id) as scoped_region_id
    from public.profiles p
    left join public.employees viewer_employee
      on viewer_employee.profile_id = p.id
      and viewer_employee.deleted_at is null
    where p.id = auth.uid()
      or lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    order by case when p.id = auth.uid() then 0 else 1 end
    limit 1
  )
  select
    lr.id as leave_request_id,
    e.id as employee_id,
    e.full_name as employee_name,
    e.employee_code,
    e.region_id,
    r.code as region_code,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    day::date as leave_date
  from viewer v
  join public.leave_requests lr
    on lr.status = 'approved'
    and lr.start_date <= get_leave_calendar.month_end
    and lr.end_date >= get_leave_calendar.month_start
  join public.employees e
    on e.id = lr.employee_id
    and e.deleted_at is null
  left join public.regions r
    on r.id = e.region_id
  cross join lateral generate_series(
    greatest(lr.start_date, get_leave_calendar.month_start),
    least(lr.end_date, get_leave_calendar.month_end),
    interval '1 day'
  ) as day
  where v.status = 'approved'
    and (
      public.current_user_is_super_admin()
      or v.can_view_all_regions = true
      or e.region_id is not distinct from v.scoped_region_id
    )
    and (
      get_leave_calendar.region_filter is null
      or (
        (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and e.region_id = get_leave_calendar.region_filter
      )
      or (
        not (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and e.region_id is not distinct from v.scoped_region_id
      )
    )
$$;
