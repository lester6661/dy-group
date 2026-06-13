-- Patch all employee detail columns used by the staff page.

alter table public.employees
  add column if not exists gender text,
  add column if not exists bank_account_name text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text;
