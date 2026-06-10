create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 60 check (break_minutes >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  work_date date not null,
  is_day_off boolean not null default false,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entries_shift_or_day_off check (
    (is_day_off = true and shift_id is null)
    or (is_day_off = false and shift_id is not null)
  ),
  constraint schedule_entries_employee_date_key unique (employee_id, work_date)
);

insert into public.shifts (name, start_time, end_time, break_minutes, is_active)
values
  ('早班', '09:00', '18:30', 60, true),
  ('晚班', '13:00', '22:30', 60, true)
on conflict do nothing;

create index if not exists shifts_is_active_idx on public.shifts(is_active);
create index if not exists schedule_entries_employee_date_idx on public.schedule_entries(employee_id, work_date);
create index if not exists schedule_entries_shift_id_idx on public.schedule_entries(shift_id);
create index if not exists schedule_entries_work_date_idx on public.schedule_entries(work_date);

drop trigger if exists set_shifts_updated_at on public.shifts;
create trigger set_shifts_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

drop trigger if exists set_schedule_entries_updated_at on public.schedule_entries;
create trigger set_schedule_entries_updated_at
before update on public.schedule_entries
for each row execute function public.set_updated_at();

alter table public.shifts enable row level security;
alter table public.schedule_entries enable row level security;

drop policy if exists "Approved users can read shifts" on public.shifts;
drop policy if exists "HR users can manage shifts" on public.shifts;

create policy "Approved users can read shifts"
on public.shifts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
);

create policy "HR users can manage shifts"
on public.shifts
for all
to authenticated
using (public.current_user_can_manage_staff())
with check (public.current_user_can_manage_staff());

drop policy if exists "Users can read scoped schedule entries" on public.schedule_entries;
drop policy if exists "HR users can insert scoped schedule entries" on public.schedule_entries;
drop policy if exists "HR users can update scoped schedule entries" on public.schedule_entries;
drop policy if exists "HR users can delete scoped schedule entries" on public.schedule_entries;

create policy "Users can read scoped schedule entries"
on public.schedule_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = schedule_entries.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
  )
);

create policy "HR users can insert scoped schedule entries"
on public.schedule_entries
for insert
to authenticated
with check (
  public.current_user_can_manage_staff()
  and exists (
    select 1
    from public.employees e
    where e.id = schedule_entries.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
      and (
        public.current_user_can_view_all_regions()
        or e.region_id is not distinct from public.current_user_region_id()
      )
  )
);

create policy "HR users can update scoped schedule entries"
on public.schedule_entries
for update
to authenticated
using (
  public.current_user_can_manage_staff()
  and exists (
    select 1
    from public.employees e
    where e.id = schedule_entries.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
  )
)
with check (
  public.current_user_can_manage_staff()
  and exists (
    select 1
    from public.employees e
    where e.id = schedule_entries.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
      and (
        public.current_user_can_view_all_regions()
        or e.region_id is not distinct from public.current_user_region_id()
      )
  )
);

create policy "HR users can delete scoped schedule entries"
on public.schedule_entries
for delete
to authenticated
using (
  public.current_user_can_manage_staff()
  and exists (
    select 1
    from public.employees e
    where e.id = schedule_entries.employee_id
      and e.deleted_at is null
      and public.employee_is_in_current_user_scope(e.region_id, e.profile_id)
  )
);
