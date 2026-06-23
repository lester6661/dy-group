begin;

create or replace function public.prevent_new_replacement_leave_requests()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.leave_type = 'replacement'
     and (tg_op = 'INSERT' or old.leave_type is distinct from new.leave_type) then
    raise exception 'Replacement leave is no longer available for new applications.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_new_replacement_leave_requests on public.leave_requests;
create trigger trg_prevent_new_replacement_leave_requests
before insert or update of leave_type on public.leave_requests
for each row
execute function public.prevent_new_replacement_leave_requests();

commit;
