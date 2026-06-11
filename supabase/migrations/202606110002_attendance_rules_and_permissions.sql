alter table public.employees
  add column if not exists start_work_time time,
  add column if not exists end_work_time time,
  add column if not exists require_attendance boolean not null default true;

alter table public.profiles
  add column if not exists region_id uuid references public.regions(id) on delete set null,
  add column if not exists can_view_all_regions boolean not null default false;

alter table public.attendance_records
  add column if not exists break_minutes integer,
  add column if not exists overtime_minutes integer,
  add column if not exists is_abnormal boolean not null default false,
  add column if not exists abnormal_types text[] not null default '{}'::text[];

alter type public.attendance_punch_type add value if not exists 'break_start';
alter type public.attendance_punch_type add value if not exists 'break_end';

create index if not exists employees_profile_id_idx on public.employees(profile_id);
create index if not exists employees_region_id_idx on public.employees(region_id);
create index if not exists profiles_region_id_idx on public.profiles(region_id);
create index if not exists attendance_records_employee_punched_idx on public.attendance_records(employee_id, punched_at);
create index if not exists attendance_records_abnormal_idx on public.attendance_records(is_abnormal) where is_abnormal = true;

update public.employees e
set profile_id = p.id,
    updated_at = now()
from public.profiles p
where e.profile_id is null
  and e.email is not null
  and lower(e.email) = lower(p.email);

update public.profiles p
set region_id = e.region_id,
    updated_at = now()
from public.employees e
where p.region_id is null
  and e.profile_id = p.id
  and e.region_id is not null;

create or replace function public.link_employee_profile_by_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is null and new.email is not null then
    select p.id into new.profile_id
    from public.profiles p
    where lower(p.email) = lower(new.email)
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_link_employee_profile_by_email on public.employees;
create trigger trg_link_employee_profile_by_email
before insert or update of email, profile_id on public.employees
for each row
execute function public.link_employee_profile_by_email();

create or replace function public.current_user_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_can_manage_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and role in ('super_admin', 'admin', 'hr')
  )
$$;

create or replace function public.current_user_can_view_all_regions()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and (role = 'super_admin' or can_view_all_regions = true)
  )
$$;

create or replace function public.current_user_region_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.region_id, e.region_id)
  from public.profiles p
  left join public.employees e on e.profile_id = p.id and e.deleted_at is null
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.employee_is_in_current_user_scope(employee_region_id uuid, employee_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
      and (
        p.role = 'super_admin'
        or p.can_view_all_regions = true
        or employee_profile_id = auth.uid()
        or (
          p.role in ('admin', 'hr')
          and employee_region_id is not distinct from public.current_user_region_id()
        )
      )
  )
$$;

drop policy if exists "Approved users can read employees" on public.employees;
drop policy if exists "Approved users can create employees" on public.employees;
drop policy if exists "Approved users can update employees" on public.employees;
drop policy if exists "HR users can insert employees" on public.employees;
drop policy if exists "HR users can update employees" on public.employees;
drop policy if exists "Users can read scoped employees" on public.employees;
drop policy if exists "HR users can insert scoped employees" on public.employees;
drop policy if exists "HR users can update scoped employees" on public.employees;
drop policy if exists "Super admins can delete employees" on public.employees;

create policy "Users can read scoped employees"
on public.employees
for select
to authenticated
using (
  deleted_at is null
  and public.employee_is_in_current_user_scope(region_id, profile_id)
);

create policy "HR users can insert scoped employees"
on public.employees
for insert
to authenticated
with check (
  public.current_user_can_manage_staff()
  and (
    public.current_user_can_view_all_regions()
    or region_id is not distinct from public.current_user_region_id()
  )
);

create policy "HR users can update scoped employees"
on public.employees
for update
to authenticated
using (
  public.current_user_can_manage_staff()
  and public.employee_is_in_current_user_scope(region_id, profile_id)
)
with check (
  public.current_user_can_manage_staff()
  and (
    public.current_user_can_view_all_regions()
    or region_id is not distinct from public.current_user_region_id()
  )
);

create policy "Super admins can delete employees"
on public.employees
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
      and role = 'super_admin'
  )
);

create or replace function public.prevent_restricted_employee_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.app_role;
begin
  select role into current_role
  from public.profiles
  where id = auth.uid()
    and status = 'approved';

  if current_role is null then
    raise exception '无权修改员工资料。';
  end if;

  if current_role <> 'super_admin' and new.require_attendance is distinct from old.require_attendance then
    raise exception '只有 Super Admin 可以修改是否需要考勤。';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_restricted_employee_updates on public.employees;
create trigger trg_prevent_restricted_employee_updates
before update on public.employees
for each row
execute function public.prevent_restricted_employee_updates();

create or replace function public.approve_registration_with_employee(
  profile_id uuid,
  region_id uuid,
  employment_type_id uuid,
  job_title_id uuid,
  hire_date date,
  start_work_time time,
  end_work_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer public.profiles;
  target_profile public.profiles;
  employee_id uuid;
begin
  select * into reviewer
  from public.profiles
  where id = auth.uid()
    and status = 'approved'
    and role in ('super_admin', 'admin', 'hr');

  if reviewer.id is null then
    raise exception '无权审核注册申请。';
  end if;

  if reviewer.role <> 'super_admin'
     and reviewer.can_view_all_regions = false
     and region_id is distinct from public.current_user_region_id() then
    raise exception '无权审核其他区域员工。';
  end if;

  if region_id is null
     or employment_type_id is null
     or job_title_id is null
     or hire_date is null
     or start_work_time is null
     or end_work_time is null then
    raise exception '请完整填写员工入职资料。';
  end if;

  select * into target_profile
  from public.profiles
  where id = approve_registration_with_employee.profile_id
    and status = 'pending_review';

  if target_profile.id is null then
    raise exception '注册申请不存在或已处理。';
  end if;

  update public.profiles
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = null,
      region_id = approve_registration_with_employee.region_id,
      updated_at = now()
  where id = target_profile.id;

  select e.id into employee_id
  from public.employees e
  where e.profile_id = target_profile.id
     or (e.email is not null and lower(e.email) = lower(target_profile.email))
  order by e.created_at asc
  limit 1;

  if employee_id is null then
    insert into public.employees (
      profile_id,
      full_name,
      email,
      phone,
      region_id,
      employment_type_id,
      job_title_id,
      status,
      hire_date,
      start_work_time,
      end_work_time,
      require_attendance
    )
    values (
      target_profile.id,
      target_profile.full_name,
      target_profile.email,
      target_profile.phone,
      approve_registration_with_employee.region_id,
      approve_registration_with_employee.employment_type_id,
      approve_registration_with_employee.job_title_id,
      'active',
      approve_registration_with_employee.hire_date,
      approve_registration_with_employee.start_work_time,
      approve_registration_with_employee.end_work_time,
      true
    );
  else
    update public.employees
    set profile_id = target_profile.id,
        full_name = coalesce(nullif(full_name, ''), target_profile.full_name),
        email = coalesce(email, target_profile.email),
        phone = coalesce(phone, target_profile.phone),
        region_id = approve_registration_with_employee.region_id,
        employment_type_id = approve_registration_with_employee.employment_type_id,
        job_title_id = approve_registration_with_employee.job_title_id,
        status = 'active',
        hire_date = approve_registration_with_employee.hire_date,
        start_work_time = approve_registration_with_employee.start_work_time,
        end_work_time = approve_registration_with_employee.end_work_time,
        require_attendance = coalesce(require_attendance, true),
        deleted_at = null,
        updated_at = now()
    where id = employee_id;
  end if;
end;
$$;
