create or replace function public.current_user_can_cancel_calendar_leave()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.status = 'approved'
      and p.role in ('super_admin', 'admin', 'hr')
      and (
        p.id = auth.uid()
        or lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
$$;

create or replace function public.cancel_calendar_leave_item(
  item_id uuid,
  item_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_cancel_calendar_leave() then
    raise exception '无权取消假期。';
  end if;

  if cancel_calendar_leave_item.item_type = 'rest' then
    update public.rest_days rd
    set status = 'cancelled',
        updated_at = now()
    where rd.id = cancel_calendar_leave_item.item_id
      and rd.status = 'confirmed';

    if not found then
      raise exception '排休不存在或已取消。';
    end if;

    return;
  end if;

  update public.leave_requests lr
  set status = 'rejected',
      review_note = coalesce(nullif(lr.review_note, ''), '已从班表取消假期。'),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where lr.id = cancel_calendar_leave_item.item_id
    and lr.status = 'approved';

  if not found then
    raise exception '假期不存在或不是已批准状态。';
  end if;
end;
$$;
