-- DY Group UI Optimization Phase 3
-- Adds extended employee profile fields.

alter table public.employees
  add column if not exists nickname text,
  add column if not exists avatar_url text,
  add column if not exists birthday date,
  add column if not exists identity_number text,
  add column if not exists address text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists base_salary numeric(12, 2);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'probation_confirm_date'
  ) then
    alter table public.employees
      add column probation_confirm_date date
      generated always as (
        case
          when hire_date is null then null
          else (hire_date + interval '3 months')::date
        end
      ) stored;
  end if;
end $$;

create index if not exists employees_nickname_idx on public.employees(nickname);
create index if not exists employees_birthday_idx on public.employees(birthday);
