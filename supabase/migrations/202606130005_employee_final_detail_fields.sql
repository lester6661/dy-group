-- DY Group employee detail final fields
-- Adds gender and emergency contact fields used by staff profile details.

alter table public.employees
  add column if not exists gender text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists bank_account_name text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;
