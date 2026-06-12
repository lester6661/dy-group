create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  note text,
  event_type text not null default 'other',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_events_event_type_check check (event_type in ('meeting', 'training', 'shooting', 'live', 'visit', 'other')),
  constraint schedule_events_status_check check (status in ('active', 'cancelled'))
);

create index if not exists schedule_events_profile_date_idx on public.schedule_events(profile_id, event_date);
create index if not exists schedule_events_event_date_idx on public.schedule_events(event_date);
create index if not exists schedule_events_status_idx on public.schedule_events(status);

drop trigger if exists set_schedule_events_updated_at on public.schedule_events;
create trigger set_schedule_events_updated_at
before update on public.schedule_events
for each row execute function public.set_updated_at();

alter table public.schedule_events enable row level security;

drop policy if exists "Users can read own schedule events" on public.schedule_events;
drop policy if exists "Users can insert own schedule events" on public.schedule_events;
drop policy if exists "Users can update own schedule events" on public.schedule_events;
drop policy if exists "Users can delete own schedule events" on public.schedule_events;

create policy "Users can read own schedule events"
on public.schedule_events
for select
to authenticated
using (profile_id = auth.uid());

create policy "Users can insert own schedule events"
on public.schedule_events
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can update own schedule events"
on public.schedule_events
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users can delete own schedule events"
on public.schedule_events
for delete
to authenticated
using (profile_id = auth.uid());
