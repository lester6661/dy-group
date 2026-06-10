create table if not exists public.rest_days (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  region_id uuid references public.regions(id) on delete set null,
  rest_date date not null,
  cycle_year integer not null,
  cycle_month integer not null check (cycle_month between 1 and 12),
  source text not null default 'manual' check (source in ('manual', 'auto')),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rest_days_employee_date_key unique (employee_id, rest_date)
);

create index if not exists rest_days_employee_cycle_idx on public.rest_days(employee_id, cycle_year, cycle_month);
create index if not exists rest_days_region_date_idx on public.rest_days(region_id, rest_date);
create index if not exists rest_days_profile_cycle_idx on public.rest_days(profile_id, cycle_year, cycle_month);

drop trigger if exists set_rest_days_updated_at on public.rest_days;
create trigger set_rest_days_updated_at
before update on public.rest_days
for each row execute function public.set_updated_at();

alter table public.rest_days enable row level security;

drop policy if exists "Users can read scoped rest days" on public.rest_days;
drop policy if exists "Users can insert own rest days" on public.rest_days;
drop policy if exists "Users can update own rest days" on public.rest_days;
drop policy if exists "Users can delete own rest days" on public.rest_days;

create policy "Users can read scoped rest days"
on public.rest_days
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = rest_days.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
  )
);

create or replace function public.get_rest_cycle_start(cycle_year integer, cycle_month integer)
returns date
language sql
immutable
as $$
  select make_date(
    case when cycle_month = 1 then cycle_year - 1 else cycle_year end,
    case when cycle_month = 1 then 12 else cycle_month - 1 end,
    26
  )
$$;

create or replace function public.get_rest_cycle_end(cycle_year integer, cycle_month integer)
returns date
language sql
immutable
as $$
  select make_date(cycle_year, cycle_month, 25)
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
    rd.id as rest_day_id,
    e.id as employee_id,
    e.profile_id,
    e.full_name as employee_name,
    e.employee_code,
    e.region_id,
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
    on r.id = e.region_id
  where v.status = 'approved'
    and (
      public.current_user_is_super_admin()
      or v.can_view_all_regions = true
      or e.region_id is not distinct from v.scoped_region_id
    )
    and (
      get_rest_day_calendar.region_filter is null
      or (
        (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and e.region_id = get_rest_day_calendar.region_filter
      )
      or (
        not (public.current_user_is_super_admin() or v.can_view_all_regions = true)
        and e.region_id is not distinct from v.scoped_region_id
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
  where (id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    and status = 'approved'
  order by case when id = auth.uid() then 0 else 1 end
  limit 1;

  if current_profile.id is null then
    raise exception '无法确认当前用户。';
  end if;

  select * into current_employee
  from public.employees
  where profile_id = current_profile.id
    and deleted_at is null
  limit 1;

  if current_employee.id is null then
    raise exception '无法确认员工资料。';
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
      source = 'manual',
      status = 'confirmed',
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.auto_fill_rest_days(
  cycle_year integer,
  cycle_month integer,
  region_filter uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cycle_start date := public.get_rest_cycle_start(cycle_year, cycle_month);
  cycle_end date := public.get_rest_cycle_end(cycle_year, cycle_month);
  affected_count integer := 0;
  employee_record record;
  existing_count integer;
  rest_date_value date;
begin
  for employee_record in
    select e.*
    from public.employees e
    where e.deleted_at is null
      and e.status = 'active'
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
      and (
        region_filter is null
        or (
          (public.current_user_can_view_all_regions() or public.current_user_is_super_admin())
          and e.region_id = region_filter
        )
        or (
          not (public.current_user_can_view_all_regions() or public.current_user_is_super_admin())
          and e.region_id is not distinct from public.current_user_region_id()
        )
      )
  loop
    select count(*) into existing_count
    from public.rest_days rd
    where rd.employee_id = employee_record.id
      and rd.cycle_year = auto_fill_rest_days.cycle_year
      and rd.cycle_month = auto_fill_rest_days.cycle_month
      and rd.status = 'confirmed';

    if existing_count < 8 then
      for rest_date_value in
        select day::date
        from generate_series(cycle_start, cycle_end, interval '1 day') as day
        where not exists (
          select 1
          from public.rest_days rd
          where rd.employee_id = employee_record.id
            and rd.rest_date = day::date
            and rd.status = 'confirmed'
        )
        order by
          case extract(dow from day)
            when 0 then 0
            when 6 then 1
            else 2
          end,
          day
        limit greatest(0, 8 - existing_count)
      loop
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
          employee_record.id,
          employee_record.profile_id,
          employee_record.region_id,
          rest_date_value,
          auto_fill_rest_days.cycle_year,
          auto_fill_rest_days.cycle_month,
          'auto',
          'confirmed'
        )
        on conflict (employee_id, rest_date) do nothing;

        affected_count := affected_count + 1;
      end loop;
    end if;
  end loop;

  return affected_count;
end;
$$;
