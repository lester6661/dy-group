create table if not exists public.recurring_todo_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  frequency text not null,
  weekly_days integer[] not null default '{}',
  monthly_day integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_todo_items_frequency_check check (frequency in ('daily', 'weekly', 'monthly', 'month_end', 'custom')),
  constraint recurring_todo_items_monthly_day_check check (monthly_day is null or (monthly_day >= 1 and monthly_day <= 31))
);

alter table public.todo_items
add column if not exists recurring_todo_id uuid references public.recurring_todo_items(id) on delete set null,
add column if not exists due_date date;

create unique index if not exists todo_items_recurring_due_unique
on public.todo_items(profile_id, recurring_todo_id, due_date)
where recurring_todo_id is not null and due_date is not null;

create index if not exists recurring_todo_items_profile_active_idx
on public.recurring_todo_items(profile_id, is_active, created_at);

drop trigger if exists set_recurring_todo_items_updated_at on public.recurring_todo_items;
create trigger set_recurring_todo_items_updated_at
before update on public.recurring_todo_items
for each row execute function public.set_updated_at();

alter table public.recurring_todo_items enable row level security;

drop policy if exists "Users can read own recurring todo items" on public.recurring_todo_items;
drop policy if exists "Users can insert own recurring todo items" on public.recurring_todo_items;
drop policy if exists "Users can update own recurring todo items" on public.recurring_todo_items;
drop policy if exists "Users can delete own recurring todo items" on public.recurring_todo_items;

create policy "Users can read own recurring todo items"
on public.recurring_todo_items
for select
to authenticated
using (profile_id = auth.uid());

create policy "Users can insert own recurring todo items"
on public.recurring_todo_items
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can update own recurring todo items"
on public.recurring_todo_items
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users can delete own recurring todo items"
on public.recurring_todo_items
for delete
to authenticated
using (profile_id = auth.uid());
