-- DY Group V1 - Phase 6 Attendance Records
-- Adds clock in/out records with live camera photo, GPS, IP, and device metadata.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_punch_type') then
    create type public.attendance_punch_type as enum ('clock_in', 'clock_out');
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false)
on conflict (id) do nothing;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  punch_type public.attendance_punch_type not null,
  punched_at timestamptz not null default now(),
  photo_path text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  accuracy numeric(10, 2),
  ip_address text,
  device_info text not null,
  created_at timestamptz not null default now()
);

create index if not exists attendance_records_profile_id_idx on public.attendance_records(profile_id);
create index if not exists attendance_records_employee_id_idx on public.attendance_records(employee_id);
create index if not exists attendance_records_punched_at_idx on public.attendance_records(punched_at);
create index if not exists attendance_records_punch_type_idx on public.attendance_records(punch_type);

alter table public.attendance_records enable row level security;

drop policy if exists "Employees can read own attendance records" on public.attendance_records;
create policy "Employees can read own attendance records"
on public.attendance_records for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Employees can create own attendance records" on public.attendance_records;
create policy "Employees can create own attendance records"
on public.attendance_records for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "Employees can upload own attendance photos" on storage.objects;
create policy "Employees can upload own attendance photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attendance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Employees can read own attendance photos" on storage.objects;
create policy "Employees can read own attendance photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attendance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
