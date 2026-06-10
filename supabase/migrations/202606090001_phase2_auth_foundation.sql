-- DY Group Production - Phase 2
-- Supabase Auth, registration review foundation, profiles/employees relation,
-- base enums, and initial system settings.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_status') then
    create type public.profile_status as enum ('pending_review', 'approved', 'rejected', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type public.employee_status as enum ('active', 'inactive', 'left');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('super_admin', 'admin', 'hr', 'manager', 'staff');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role public.app_role not null default 'staff',
  status public.profile_status not null default 'pending_review',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_titles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  employee_code text unique,
  full_name text not null,
  email text,
  phone text,
  region_id uuid references public.regions(id) on delete set null,
  employment_type_id uuid references public.employment_types(id) on delete set null,
  job_title_id uuid references public.job_titles(id) on delete set null,
  status public.employee_status not null default 'active',
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists employees_profile_id_idx on public.employees(profile_id);
create index if not exists employees_region_id_idx on public.employees(region_id);
create index if not exists employees_employment_type_id_idx on public.employees(employment_type_id);
create index if not exists employees_job_title_id_idx on public.employees(job_title_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_regions_updated_at on public.regions;
create trigger set_regions_updated_at
before update on public.regions
for each row execute function public.set_updated_at();

drop trigger if exists set_employment_types_updated_at on public.employment_types;
create trigger set_employment_types_updated_at
before update on public.employment_types
for each row execute function public.set_updated_at();

drop trigger if exists set_job_titles_updated_at on public.job_titles;
create trigger set_job_titles_updated_at
before update on public.job_titles
for each row execute function public.set_updated_at();

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '待审核用户'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'pending_review'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.employment_types enable row level security;
alter table public.job_titles enable row level security;
alter table public.employees enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
create policy "Profiles can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Authenticated users can read active regions" on public.regions;
create policy "Authenticated users can read active regions"
on public.regions for select
to authenticated
using (is_active = true);

drop policy if exists "Authenticated users can read active employment types" on public.employment_types;
create policy "Authenticated users can read active employment types"
on public.employment_types for select
to authenticated
using (is_active = true);

drop policy if exists "Authenticated users can read active job titles" on public.job_titles;
create policy "Authenticated users can read active job titles"
on public.job_titles for select
to authenticated
using (is_active = true);

insert into public.regions (code, name, sort_order)
values
  ('KCH', 'KCH', 10),
  ('KL', 'KL', 20)
on conflict (code) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.employment_types (name, sort_order)
values
  ('全职', 10),
  ('兼职', 20),
  ('自由业者', 30),
  ('试用期', 40),
  ('实习', 50)
on conflict (name) do update
set sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.job_titles (name, sort_order)
values
  ('运营长', 10),
  ('运营主管', 20),
  ('HR', 30),
  ('经纪人', 40),
  ('星探', 50),
  ('美工', 60),
  ('财务', 70),
  ('行政', 80),
  ('实习生', 90),
  ('Super Admin', 100)
on conflict (name) do update
set sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
