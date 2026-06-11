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
    e.full_name as employee_name,
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

create or replace function public.save_my_rest_days(
  cycle_year integer,
  cycle_month integer,
  rest_dates date[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cycle_start date := public.get_rest_cycle_start(cycle_year, cycle_month);
  cycle_end date := public.get_rest_cycle_end(cycle_year, cycle_month);
  available_cycle date := date_trunc('month', current_date)::date
    + case when extract(day from current_date) < 26 then interval '1 month' else interval '2 months' end;
  current_profile public.profiles;
  current_employee public.employees;
  rest_date_value date;
begin
  select * into current_profile
  from public.profiles
  where (
      id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and status = 'approved'
  order by case when id = auth.uid() then 0 else 1 end
  limit 1;

  if current_profile.id is null then
    raise exception '无法确认当前用户。';
  end if;

  select * into current_employee
  from public.employees
  where deleted_at is null
    and (
      profile_id = current_profile.id
      or lower(email) = lower(current_profile.email)
    )
  order by
    case when profile_id = current_profile.id then 0 else 1 end,
    created_at
  limit 1;

  if current_employee.id is null then
    raise exception '无法确认员工资料，请先在工作人员页面绑定员工资料。';
  end if;

  if current_employee.profile_id is null then
    update public.employees
    set profile_id = current_profile.id,
        updated_at = now()
    where id = current_employee.id;

    current_employee.profile_id := current_profile.id;
  end if;

  if save_my_rest_days.cycle_year <> extract(year from available_cycle)::integer
     or save_my_rest_days.cycle_month <> extract(month from available_cycle)::integer then
    raise exception '只能选择当前可排休周期。';
  end if;

  if current_date >= cycle_start then
    raise exception '已过排休截止日期，不能修改本周期排休。';
  end if;

  if array_length(rest_dates, 1) is null or array_length(rest_dates, 1) = 0 then
    raise exception '请选择排休日期。';
  end if;

  if array_length(rest_dates, 1) > 8 then
    raise exception '每个周期最多只能选择 8 天排休。';
  end if;

  foreach rest_date_value in array rest_dates loop
    if rest_date_value < cycle_start or rest_date_value > cycle_end then
      raise exception '排休日期必须在当前排休周期内。';
    end if;
  end loop;

  delete from public.rest_days
  where employee_id = current_employee.id
    and cycle_year = save_my_rest_days.cycle_year
    and cycle_month = save_my_rest_days.cycle_month;

  foreach rest_date_value in array rest_dates loop
    insert into public.rest_days (
      employee_id,
      profile_id,
      region_id,
      rest_date,
      cycle_year,
      cycle_month,
      source,
      status
    )
    values (
      current_employee.id,
      current_profile.id,
      current_employee.region_id,
      rest_date_value,
      save_my_rest_days.cycle_year,
      save_my_rest_days.cycle_month,
      'manual',
      'confirmed'
    )
    on conflict (employee_id, rest_date)
    do update set
      profile_id = excluded.profile_id,
      region_id = excluded.region_id,
      source = 'manual',
      status = 'confirmed',
      updated_at = now();
  end loop;
end;
$$;
