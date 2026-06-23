begin;

create table if not exists public.public_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_name text not null,
  holiday_date date not null,
  region_id uuid references public.regions(id) on delete set null,
  note text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_holidays_name_check check (length(trim(holiday_name)) > 0)
);

create index if not exists public_holidays_date_idx on public.public_holidays(holiday_date);
create index if not exists public_holidays_region_id_idx on public.public_holidays(region_id);
create index if not exists public_holidays_active_idx on public.public_holidays(is_active) where is_active = true;

drop trigger if exists set_public_holidays_updated_at on public.public_holidays;
create trigger set_public_holidays_updated_at
before update on public.public_holidays
for each row execute function public.set_updated_at();

create or replace function public.current_user_can_manage_public_holidays()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'approved'
      and p.role in ('super_admin', 'admin', 'hr')
  )
$$;

alter table public.public_holidays enable row level security;

drop policy if exists "Approved users can read active public holidays" on public.public_holidays;
create policy "Approved users can read active public holidays"
on public.public_holidays
for select
to authenticated
using (
  is_active = true
  and (
    public.current_user_can_manage_public_holidays()
    or region_id is null
    or public.current_user_can_access_region(region_id)
  )
);

drop policy if exists "HR users can manage public holidays" on public.public_holidays;
create policy "HR users can manage public holidays"
on public.public_holidays
for all
to authenticated
using (public.current_user_can_manage_public_holidays())
with check (public.current_user_can_manage_public_holidays());

commit;
