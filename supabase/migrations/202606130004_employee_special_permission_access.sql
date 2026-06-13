alter table public.employee_special_permissions
  add column if not exists can_view boolean not null default true,
  add column if not exists can_use boolean not null default true;

alter table public.employee_special_permissions
  drop constraint if exists employee_special_permissions_use_requires_view;

alter table public.employee_special_permissions
  add constraint employee_special_permissions_use_requires_view
  check (can_view or not can_use);
