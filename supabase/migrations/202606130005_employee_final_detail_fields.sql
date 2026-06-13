-- DY Group employee detail final fields
-- Adds gender and emergency contact fields used by staff profile details.

alter table public.employees
  add column if not exists gender text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relationship text;
