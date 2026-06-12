set client_encoding = 'UTF8';

update public.permission_items
set name = case permission_key
  when 'scout' then '星探'
  when 'agent' then '经纪人'
  when 'designer' then '美工'
  when 'hr' then '人事部'
  when 'staff' then '工作人员'
  when 'registration-review' then '注册审核'
  when 'leave-review' then '请假审核'
  when 'attendance-management' then '考勤'
  when 'management' then '管理'
  when 'settings' then '系统设置'
  when 'permission-management' then '权限管理'
  when 'region-management' then '区域管理'
  when 'job-title-management' then '职称管理'
  when 'employment-type-management' then '雇佣类型管理'
  else name
end
where permission_key in (
  'scout',
  'agent',
  'designer',
  'hr',
  'staff',
  'registration-review',
  'leave-review',
  'attendance-management',
  'management',
  'settings',
  'permission-management',
  'region-management',
  'job-title-management',
  'employment-type-management'
);

delete from public.special_permission_templates
where name like '%?%';

insert into public.special_permission_templates (name, description, sort_order, is_active)
values
  ('管理员', '管理员特殊权限模板。当前阶段仅保留架构，不接入实际权限控制。', 10, true),
  ('高级管理员', '高级管理员特殊权限模板。当前阶段仅保留架构，不接入实际权限控制。', 20, true)
on conflict (name) do update
set
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
