-- DY Group V1 - Phase 3 Registration Review
-- Adds reviewer permissions and RPC functions for approving/rejecting registrations.

create or replace function public.current_user_can_review_registrations()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin', 'hr')
      and status = 'approved'
  );
$$;

create or replace function public.approve_registration(profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_review_registrations() then
    raise exception 'Only super_admin, admin, or hr can approve registrations.';
  end if;

  update public.profiles
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = null,
      updated_at = now()
  where id = profile_id
    and status = 'pending_review';
end;
$$;

create or replace function public.reject_registration(profile_id uuid, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_review_registrations() then
    raise exception 'Only super_admin, admin, or hr can reject registrations.';
  end if;

  if nullif(trim(note), '') is null then
    raise exception 'Review note is required when rejecting a registration.';
  end if;

  update public.profiles
  set status = 'rejected',
      review_note = trim(note),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = profile_id
    and status = 'pending_review';
end;
$$;

drop policy if exists "Reviewers can read pending profiles" on public.profiles;
create policy "Reviewers can read pending profiles"
on public.profiles for select
to authenticated
using (
  public.current_user_can_review_registrations()
  and status = 'pending_review'
);
