-- Registration and employee onboarding flow V2.

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists gender text,
  add column if not exists birthday date,
  add column if not exists identity_number text;

alter type public.employee_status add value if not exists 'probation' before 'active';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_region_id uuid;
begin
  select id into requested_region_id
  from public.regions
  where upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'region_code', ''))
    and is_active = true
  order by sort_order, created_at
  limit 1;

  insert into public.profiles (
    id,
    email,
    full_name,
    nickname,
    phone,
    gender,
    birthday,
    identity_number,
    region_id,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), '待审核用户'),
    nullif(new.raw_user_meta_data ->> 'nickname', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    nullif(new.raw_user_meta_data ->> 'identity_number', ''),
    requested_region_id,
    'pending_review'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    phone = excluded.phone,
    gender = excluded.gender,
    birthday = excluded.birthday,
    identity_number = excluded.identity_number,
    region_id = excluded.region_id,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.generate_employee_code(region_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  region_code text;
  next_number integer;
begin
  select upper(code) into region_code
  from public.regions
  where id = generate_employee_code.region_id;

  if region_code is null then
    raise exception '无法生成员工编号：区域不存在。';
  end if;

  select coalesce(max(substring(employee_code from length(region_code) + 1)::integer), 0) + 1
  into next_number
  from public.employees
  where employee_code ~ ('^' || region_code || '[0-9]{3,}$');

  return region_code || lpad(next_number::text, 3, '0');
end;
$$;
