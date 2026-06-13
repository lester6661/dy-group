-- Leave calendar V2: nickname display, details data, permission-aware cancellation.

drop function if exists public.get_leave_calendar(date, date, uuid);

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
  leave_date date,
  applicant_name text,
  reviewer_name text,
  reviewed_at timestamptz
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
    coalesce(nullif(e.nickname, ''), e.full_name) as employee_name,
    e.employee_code,
    e.region_id,
    r.code as region_code,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    day::date as leave_date,
    coalesce(nullif(applicant_employee.nickname, ''), applicant_employee.full_name, applicant_profile.full_name) as applicant_name,
    coalesce(nullif(reviewer_employee.nickname, ''), reviewer_employee.full_name, reviewer_profile.full_name) as reviewer_name,
    lr.reviewed_at
  from viewer v
  join public.leave_requests lr
    on lr.status = 'approved'
    and (
      case when lr.leave_type = 'replacement' then lr.end_date else lr.start_date end
    ) <= get_leave_calendar.month_end
    and (
      case when lr.leave_type = 'replacement' then lr.end_date else lr.end_date end
    ) >= get_leave_calendar.month_start
  join public.employees e
    on e.id = lr.employee_id
    and e.deleted_at is null
  left join public.regions r
    on r.id = e.region_id
  left join public.profiles applicant_profile
    on applicant_profile.id = lr.profile_id
  left join public.employees applicant_employee
    on applicant_employee.profile_id = lr.profile_id
    and applicant_employee.deleted_at is null
  left join public.profiles reviewer_profile
    on reviewer_profile.id = lr.reviewed_by
  left join public.employees reviewer_employee
    on reviewer_employee.profile_id = lr.reviewed_by
    and reviewer_employee.deleted_at is null
  cross join lateral generate_series(
    greatest(
      case when lr.leave_type = 'replacement' then lr.end_date else lr.start_date end,
      get_leave_calendar.month_start
    ),
    least(
      case when lr.leave_type = 'replacement' then lr.end_date else lr.end_date end,
      get_leave_calendar.month_end
    ),
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

create or replace function public.get_rest_day_calendar(
  cycle_year integer,
  cycle_month integer,
  region_filter uuid default null
)
returns table (
  rest_day_id uuid,
  employee_id uuid,
  profile_id uuid,
  employee_name text,
  employee_code text,
  region_id uuid,
  region_code text,
  rest_date date,
  source text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      p.id,
      p.email,
      p.status,
      p.role,
      p.can_view_all_regions,
      coalesce(p.region_id, viewer_employee.region_id) as scoped_region_id
    from public.profiles p
    left join public.employees viewer_employee
      on (
        viewer_employee.profile_id = p.id
        or lower(viewer_employee.email) = lower(p.email)
      )
      and viewer_employee.deleted_at is null
    where p.id = auth.uid()
      or lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    order by case when p.id = auth.uid() then 0 else 1 end
    limit 1
  )
  select
    rd.id as rest_day_id,
    e.id as employee_id,
    rd.profile_id,
    coalesce(nullif(e.nickname, ''), e.full_name) as employee_name,
    e.employee_code,
    coalesce(rd.region_id, e.region_id) as region_id,
    r.code as region_code,
    rd.rest_date,
    rd.source,
    rd.status
  from viewer v
  join public.rest_days rd
    on rd.cycle_year = get_rest_day_calendar.cycle_year
    and rd.cycle_month = get_rest_day_calendar.cycle_month
    and rd.status = 'confirmed'
  join public.employees e
    on e.id = rd.employee_id
    and e.deleted_at is null
  left join public.regions r
    on r.id = coalesce(rd.region_id, e.region_id)
  where v.status = 'approved'
    and (
      public.current_user_is_super_admin()
      or v.can_view_all_regions = true
      or rd.profile_id = v.id
      or coalesce(rd.region_id, e.region_id) is not distinct from v.scoped_region_id
    )
    and (
      get_rest_day_calendar.region_filter is null
      or (
        (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and coalesce(rd.region_id, e.region_id) = get_rest_day_calendar.region_filter
      )
      or (
        not (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and coalesce(rd.region_id, e.region_id) is not distinct from v.scoped_region_id
      )
    )
$$;

create or replace function public.current_user_can_cancel_calendar_leave()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select
      p.id as profile_id,
      p.email,
      p.role,
      p.status,
      e.id as employee_id,
      e.job_title_id
    from public.profiles p
    left join public.employees e
      on (
        e.profile_id = p.id
        or lower(e.email) = lower(p.email)
      )
      and e.deleted_at is null
    where p.id = auth.uid()
      or lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    order by case when p.id = auth.uid() then 0 else 1 end
    limit 1
  )
  select exists (
    select 1
    from viewer v
    where v.status = 'approved'
      and (
        public.current_user_is_super_admin()
        or exists (
          select 1
          from public.job_title_permission_templates jtpt
          where jtpt.job_title_id = v.job_title_id
            and jtpt.permission_key in ('hr', 'leave-review')
            and jtpt.can_use = true
        )
        or exists (
          select 1
          from public.employee_special_permissions esp
          join public.special_permission_template_items spti
            on spti.special_permission_template_id = esp.special_permission_template_id
          where esp.employee_id = v.employee_id
            and esp.is_enabled = true
            and esp.can_use = true
            and spti.permission_key in ('hr', 'leave-review')
            and spti.can_use = true
        )
        or exists (
          select 1
          from public.employee_permission_overrides epo
          where epo.employee_id = v.employee_id
            and epo.permission_key in ('hr', 'leave-review')
            and epo.can_use = true
        )
      )
  )
$$;

drop function if exists public.cancel_calendar_leave_item(uuid, text);

create or replace function public.cancel_calendar_leave_item(
  item_id uuid,
  item_type text,
  cancel_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  final_reason text := nullif(trim(coalesce(cancel_reason, '')), '');
begin
  if not public.current_user_can_cancel_calendar_leave() then
    raise exception '无权取消假期。';
  end if;

  if final_reason is null then
    raise exception '请填写取消原因。';
  end if;

  if cancel_calendar_leave_item.item_type = 'rest' then
    update public.rest_days rd
    set status = 'cancelled',
        updated_at = now()
    where rd.id = cancel_calendar_leave_item.item_id
      and rd.status = 'confirmed';

    if not found then
      raise exception '休假不存在或已取消。';
    end if;

    return;
  end if;

  update public.leave_requests lr
  set status = 'rejected',
      review_note = final_reason,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where lr.id = cancel_calendar_leave_item.item_id
    and lr.status = 'approved';

  if not found then
    raise exception '假期不存在或不是已批准状态。';
  end if;
end;
$$;
