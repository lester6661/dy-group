create or replace function public.approve_registration_with_employee(
  profile_id uuid,
  employment_type_id uuid,
  job_title_id uuid,
  employee_status public.employee_status,
  hire_date date,
  start_work_time time,
  end_work_time time,
  require_attendance boolean,
  base_salary numeric default null
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
  next_employee_code text;
begin
  select * into reviewer
  from public.profiles
  where id = auth.uid()
    and status = 'approved'
    and role in ('super_admin', 'admin', 'hr');

  if reviewer.id is null then
    raise exception '无权审核注册申请。';
  end if;

  select * into target_profile
  from public.profiles
  where id = approve_registration_with_employee.profile_id
    and status = 'pending_review';

  if target_profile.id is null then
    raise exception '注册申请不存在或已处理。';
  end if;

  if reviewer.role <> 'super_admin'
     and reviewer.can_view_all_regions = false
     and target_profile.region_id is distinct from public.current_user_region_id() then
    raise exception '无权审核其他区域人员。';
  end if;

  if target_profile.region_id is null
     or employment_type_id is null
     or job_title_id is null
     or employee_status is null
     or hire_date is null
     or start_work_time is null
     or end_work_time is null then
    raise exception '请完整填写人员入职资料。';
  end if;

  update public.profiles
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = null,
      updated_at = now()
  where id = target_profile.id;

  select e.id into employee_id
  from public.employees e
  where e.profile_id = target_profile.id
     or (e.email is not null and lower(e.email) = lower(target_profile.email))
  order by e.created_at asc
  limit 1;

  if employee_id is null then
    next_employee_code := public.generate_employee_code(target_profile.region_id);

    insert into public.employees (
      profile_id,
      employee_code,
      full_name,
      nickname,
      email,
      phone,
      gender,
      birthday,
      identity_number,
      region_id,
      employment_type_id,
      job_title_id,
      status,
      hire_date,
      start_work_time,
      end_work_time,
      require_attendance,
      base_salary,
      reviewed_by,
      reviewed_at
    )
    values (
      target_profile.id,
      next_employee_code,
      target_profile.full_name,
      target_profile.nickname,
      target_profile.email,
      target_profile.phone,
      target_profile.gender,
      target_profile.birthday,
      target_profile.identity_number,
      target_profile.region_id,
      approve_registration_with_employee.employment_type_id,
      approve_registration_with_employee.job_title_id,
      approve_registration_with_employee.employee_status,
      approve_registration_with_employee.hire_date,
      approve_registration_with_employee.start_work_time,
      approve_registration_with_employee.end_work_time,
      coalesce(approve_registration_with_employee.require_attendance, true),
      approve_registration_with_employee.base_salary,
      auth.uid(),
      now()
    );
  else
    select coalesce(employee_code, public.generate_employee_code(target_profile.region_id))
    into next_employee_code
    from public.employees
    where id = employee_id;

    update public.employees
    set profile_id = target_profile.id,
        employee_code = next_employee_code,
        full_name = target_profile.full_name,
        nickname = target_profile.nickname,
        email = target_profile.email,
        phone = target_profile.phone,
        gender = target_profile.gender,
        birthday = target_profile.birthday,
        identity_number = target_profile.identity_number,
        region_id = target_profile.region_id,
        employment_type_id = approve_registration_with_employee.employment_type_id,
        job_title_id = approve_registration_with_employee.job_title_id,
        status = approve_registration_with_employee.employee_status,
        hire_date = approve_registration_with_employee.hire_date,
        start_work_time = approve_registration_with_employee.start_work_time,
        end_work_time = approve_registration_with_employee.end_work_time,
        require_attendance = coalesce(approve_registration_with_employee.require_attendance, true),
        base_salary = approve_registration_with_employee.base_salary,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        deleted_at = null,
        updated_at = now()
    where id = employee_id;
  end if;
end;
$$;
