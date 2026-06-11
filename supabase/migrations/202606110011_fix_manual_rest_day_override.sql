drop function if exists public.save_my_rest_days(integer, integer, date[]);

create or replace function public.save_my_rest_days(
  cycle_year integer,
  cycle_month integer,
  rest_dates date[]
)
returns integer
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
  normalized_rest_dates date[];
  saved_count integer := 0;
begin
  select array_agg(distinct rest_date_item order by rest_date_item)
  into normalized_rest_dates
  from unnest(rest_dates) as rest_date_item;

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

  if array_length(normalized_rest_dates, 1) is null or array_length(normalized_rest_dates, 1) = 0 then
    raise exception '请选择排休日期。';
  end if;

  if array_length(normalized_rest_dates, 1) > 8 then
    raise exception '每个周期最多只能选择 8 天排休。';
  end if;

  foreach rest_date_value in array normalized_rest_dates loop
    if rest_date_value < cycle_start or rest_date_value > cycle_end then
      raise exception '排休日期必须在当前排休周期内。';
    end if;
  end loop;

  update public.rest_days
  set status = 'cancelled',
      updated_at = now()
  where employee_id = current_employee.id
    and cycle_year = save_my_rest_days.cycle_year
    and cycle_month = save_my_rest_days.cycle_month
    and status = 'confirmed';

  foreach rest_date_value in array normalized_rest_dates loop
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
      cycle_year = excluded.cycle_year,
      cycle_month = excluded.cycle_month,
      source = 'manual',
      status = 'confirmed',
      updated_at = now();

    saved_count := saved_count + 1;
  end loop;

  return saved_count;
end;
$$;
