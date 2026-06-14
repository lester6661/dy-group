create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_items_profile_completed_idx on public.todo_items(profile_id, is_completed, created_at);

drop trigger if exists set_todo_items_updated_at on public.todo_items;
create trigger set_todo_items_updated_at
before update on public.todo_items
for each row execute function public.set_updated_at();

alter table public.todo_items enable row level security;

drop policy if exists "Users can read own todo items" on public.todo_items;
drop policy if exists "Users can insert own todo items" on public.todo_items;
drop policy if exists "Users can update own todo items" on public.todo_items;
drop policy if exists "Users can delete own todo items" on public.todo_items;

create policy "Users can read own todo items"
on public.todo_items
for select
to authenticated
using (profile_id = auth.uid());

create policy "Users can insert own todo items"
on public.todo_items
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can update own todo items"
on public.todo_items
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users can delete own todo items"
on public.todo_items
for delete
to authenticated
using (profile_id = auth.uid());
