create function public.create_practice_with_owner(practice_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_practice_name text := pg_catalog.btrim(practice_name);
  selected_practice_id uuid;
begin
  if actor_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if normalized_practice_name is null or normalized_practice_name = '' then
    raise exception 'Practice name is required.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_user_id::text, 0)
  );

  select practice_members.practice_id
  into selected_practice_id
  from public.practice_members as practice_members
  where practice_members.user_id = actor_user_id
  order by practice_members.practice_id
  limit 1;

  if selected_practice_id is not null then
    return selected_practice_id;
  end if;

  insert into public.practices as new_practice (name, created_by)
  values (normalized_practice_name, actor_user_id)
  returning new_practice.id into selected_practice_id;

  insert into public.practice_members (practice_id, user_id, role)
  values (selected_practice_id, actor_user_id, 'owner');

  return selected_practice_id;
end;
$$;

revoke execute on function public.create_practice_with_owner(text) from public;
revoke execute on function public.create_practice_with_owner(text) from anon;
grant execute on function public.create_practice_with_owner(text) to authenticated;
