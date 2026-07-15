create function public.set_next_hearing(
  target_case_id uuid,
  scheduled_date date,
  scheduled_time time default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  latest_hearing_id uuid;
  latest_hearing_date date;
  existing_next_hearing_date date;
begin
  if actor_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if scheduled_date is null then
    raise exception 'Next hearing date is required.'
      using errcode = '22023';
  end if;

  select
    hearing_rows.id,
    hearing_rows.hearing_date,
    hearing_rows.next_hearing_date
  into
    latest_hearing_id,
    latest_hearing_date,
    existing_next_hearing_date
  from public.hearings as hearing_rows
  inner join public.cases as case_rows
    on case_rows.id = hearing_rows.case_id
    and case_rows.practice_id = hearing_rows.practice_id
  inner join public.practice_members as memberships
    on memberships.practice_id = case_rows.practice_id
    and memberships.user_id = actor_user_id
  where hearing_rows.case_id = target_case_id
  order by
    hearing_rows.hearing_date desc,
    hearing_rows.hearing_time desc nulls last,
    hearing_rows.created_at desc
  limit 1
  for update of hearing_rows;

  if latest_hearing_id is null then
    raise exception 'The case or hearing is unavailable.'
      using errcode = '42501';
  end if;

  if existing_next_hearing_date is not null then
    raise exception 'A next hearing is already scheduled.'
      using errcode = '22023';
  end if;

  if scheduled_date < latest_hearing_date then
    raise exception 'Next hearing date cannot be earlier than the current hearing date.'
      using errcode = '22023';
  end if;

  update public.hearings as hearing_rows
  set
    next_hearing_date = scheduled_date,
    next_hearing_time = scheduled_time,
    updated_at = pg_catalog.now()
  where hearing_rows.id = latest_hearing_id
    and hearing_rows.case_id = target_case_id;

  return latest_hearing_id;
end;
$$;

revoke execute on function public.set_next_hearing(uuid, date, time) from public;
revoke execute on function public.set_next_hearing(uuid, date, time) from anon;
grant execute on function public.set_next_hearing(uuid, date, time) to authenticated;
