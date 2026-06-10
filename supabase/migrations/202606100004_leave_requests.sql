-- DY Group V1 - Phase 5 Leave Requests
-- Adds employee leave applications and HR review workflow.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'leave_type') then
    create type public.leave_type as enum ('annual', 'medical', 'unpaid', 'replacement');
  end if;

  if not exists (select 1 from pg_type where typname = 'leave_request_status') then
    create type public.leave_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  medical_attachment_url text,
  status public.leave_request_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_date_range_check check (end_date >= start_date)
);

create index if not exists leave_requests_profile_id_idx on public.leave_requests(profile_id);
create index if not exists leave_requests_employee_id_idx on public.leave_requests(employee_id);
create index if not exists leave_requests_status_idx on public.leave_requests(status);
create index if not exists leave_requests_start_end_idx on public.leave_requests(start_date, end_date);

drop trigger if exists set_leave_requests_updated_at on public.leave_requests;
create trigger set_leave_requests_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create or replace function public.current_user_can_review_leave_requests()
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

create or replace function public.approve_leave_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_review_leave_requests() then
    raise exception 'Only super_admin, admin, or hr can approve leave requests.';
  end if;

  update public.leave_requests
  set status = 'approved',
      review_note = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = request_id
    and status = 'pending';
end;
$$;

create or replace function public.reject_leave_request(request_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_review_leave_requests() then
    raise exception 'Only super_admin, admin, or hr can reject leave requests.';
  end if;

  if nullif(trim(note), '') is null then
    raise exception 'Review note is required when rejecting a leave request.';
  end if;

  update public.leave_requests
  set status = 'rejected',
      review_note = trim(note),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = request_id
    and status = 'pending';
end;
$$;

alter table public.leave_requests enable row level security;

drop policy if exists "Employees can read own leave requests" on public.leave_requests;
create policy "Employees can read own leave requests"
on public.leave_requests for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "Employees can create own leave requests" on public.leave_requests;
create policy "Employees can create own leave requests"
on public.leave_requests for insert
to authenticated
with check (
  auth.uid() = profile_id
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "Reviewers can read pending leave requests" on public.leave_requests;
create policy "Reviewers can read pending leave requests"
on public.leave_requests for select
to authenticated
using (
  public.current_user_can_review_leave_requests()
  and status = 'pending'
);
