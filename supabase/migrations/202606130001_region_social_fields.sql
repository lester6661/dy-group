alter table public.regions
  add column if not exists company_instagram text,
  add column if not exists company_facebook text;
