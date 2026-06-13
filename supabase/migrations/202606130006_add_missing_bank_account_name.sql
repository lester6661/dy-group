-- Patch missing employee bank account holder name column.

alter table public.employees
  add column if not exists bank_account_name text;
