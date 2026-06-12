alter table public.regions
  add column if not exists company_english_name text,
  add column if not exists company_registration_no text;
