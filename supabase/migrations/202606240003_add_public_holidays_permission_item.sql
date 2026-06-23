begin;

insert into public.permission_items (permission_key, parent_key, name, sort_order, is_reserved)
values ('public-holidays', 'hr', '公共假期', 45, false)
on conflict (permission_key) do update
set
  parent_key = excluded.parent_key,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_reserved = excluded.is_reserved;

commit;
