create table if not exists public.permission_items (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null unique,
  parent_key text,
  name text not null,
  scope text not null default 'work_tool',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_reserved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permission_items_parent_fk
    foreign key (parent_key)
    references public.permission_items(permission_key)
    on delete cascade
);

create table if not exists public.special_permission_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_title_permission_templates (
  id uuid primary key default gen_random_uuid(),
  job_title_id uuid not null references public.job_titles(id) on delete cascade,
  permission_key text not null references public.permission_items(permission_key) on delete cascade,
  can_view boolean not null default false,
  can_use boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_title_permission_templates_unique unique (job_title_id, permission_key),
  constraint job_title_permission_templates_use_requires_view check (can_view or not can_use)
);

create table if not exists public.special_permission_template_items (
  id uuid primary key default gen_random_uuid(),
  special_permission_template_id uuid not null references public.special_permission_templates(id) on delete cascade,
  permission_key text not null references public.permission_items(permission_key) on delete cascade,
  can_view boolean not null default false,
  can_use boolean not null default false,
  effect text not null default 'grant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint special_permission_template_items_unique unique (special_permission_template_id, permission_key),
  constraint special_permission_template_items_effect_check check (effect in ('grant', 'deny')),
  constraint special_permission_template_items_use_requires_view check (can_view or not can_use)
);

create table if not exists public.employee_permission_settings (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  require_attendance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_permission_regions (
  employee_id uuid not null references public.employees(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, region_id)
);

create table if not exists public.employee_special_permissions (
  employee_id uuid not null references public.employees(id) on delete cascade,
  special_permission_template_id uuid not null references public.special_permission_templates(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (employee_id, special_permission_template_id)
);

create table if not exists public.employee_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  permission_key text not null references public.permission_items(permission_key) on delete cascade,
  can_view boolean not null default false,
  can_use boolean not null default false,
  effect text not null default 'grant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_permission_overrides_unique unique (employee_id, permission_key),
  constraint employee_permission_overrides_effect_check check (effect in ('grant', 'deny')),
  constraint employee_permission_overrides_use_requires_view check (can_view or not can_use)
);

create index if not exists permission_items_parent_key_idx on public.permission_items(parent_key);
create index if not exists job_title_permission_templates_job_title_id_idx on public.job_title_permission_templates(job_title_id);
create index if not exists special_permission_template_items_template_id_idx on public.special_permission_template_items(special_permission_template_id);
create index if not exists employee_permission_regions_region_id_idx on public.employee_permission_regions(region_id);
create index if not exists employee_special_permissions_template_id_idx on public.employee_special_permissions(special_permission_template_id);
create index if not exists employee_permission_overrides_employee_id_idx on public.employee_permission_overrides(employee_id);

insert into public.permission_items (permission_key, parent_key, name, sort_order, is_reserved)
values
  ('scout', null, '星探', 10, false),
  ('agent', null, '经纪人', 20, false),
  ('designer', null, '美工', 30, false),
  ('hr', null, '人事部', 40, false),
  ('staff', 'hr', '工作人员', 41, false),
  ('registration-review', 'hr', '注册审核', 42, false),
  ('leave-review', 'hr', '请假审核', 43, false),
  ('attendance-management', 'hr', '考勤', 44, false),
  ('management', null, '管理', 90, false),
  ('settings', 'management', '系统设置', 91, true),
  ('permission-management', 'management', '权限管理', 92, true),
  ('region-management', 'management', '区域管理', 93, true),
  ('job-title-management', 'management', '职称管理', 94, true),
  ('employment-type-management', 'management', '雇佣类型管理', 95, true)
on conflict (permission_key) do update
set
  parent_key = excluded.parent_key,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_reserved = excluded.is_reserved;

insert into public.special_permission_templates (name, description, sort_order)
values
  ('管理员', '管理员特殊权限模板。当前阶段仅保留架构，不接入实际权限控制。', 10),
  ('高级管理员', '高级管理员特殊权限模板。当前阶段仅保留架构，不接入实际权限控制。', 20)
on conflict (name) do update
set
  description = excluded.description,
  sort_order = excluded.sort_order;
