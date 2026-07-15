create function public.create_case_with_client(
  case_title text,
  case_number text,
  court_name text,
  case_type text default null,
  cnr_number text default null,
  filing_date date default null,
  notes text default null,
  existing_client_id uuid default null,
  new_client_name text default null,
  new_client_phone text default null,
  new_client_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  selected_practice_id uuid;
  selected_client_id uuid;
  created_case_id uuid;
  normalized_case_title text := nullif(pg_catalog.btrim(case_title), '');
  normalized_case_number text := nullif(pg_catalog.btrim(case_number), '');
  normalized_court_name text := nullif(pg_catalog.btrim(court_name), '');
  normalized_case_type text := nullif(pg_catalog.btrim(case_type), '');
  normalized_cnr_number text := nullif(pg_catalog.btrim(cnr_number), '');
  normalized_notes text := nullif(pg_catalog.btrim(notes), '');
  normalized_new_client_name text := nullif(pg_catalog.btrim(new_client_name), '');
  normalized_new_client_phone text := nullif(pg_catalog.btrim(new_client_phone), '');
  normalized_new_client_email text := nullif(pg_catalog.lower(pg_catalog.btrim(new_client_email)), '');
  inline_client_requested boolean;
begin
  if actor_user_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if normalized_case_title is null then
    raise exception 'Case title is required.'
      using errcode = '22023';
  end if;

  if normalized_case_number is null then
    raise exception 'Case number is required.'
      using errcode = '22023';
  end if;

  if normalized_court_name is null then
    raise exception 'Court name is required.'
      using errcode = '22023';
  end if;

  select practice_members.practice_id
  into selected_practice_id
  from public.practice_members as practice_members
  where practice_members.user_id = actor_user_id
  order by practice_members.practice_id
  limit 1;

  if selected_practice_id is null then
    raise exception 'Practice membership is required.'
      using errcode = '42501';
  end if;

  inline_client_requested :=
    normalized_new_client_name is not null
    or normalized_new_client_phone is not null
    or normalized_new_client_email is not null;

  if existing_client_id is not null and inline_client_requested then
    raise exception 'Choose either an existing client or a new client.'
      using errcode = '22023';
  end if;

  if existing_client_id is not null then
    select clients.id
    into selected_client_id
    from public.clients as clients
    where clients.id = existing_client_id
      and clients.practice_id = selected_practice_id;

    if selected_client_id is null then
      raise exception 'The selected client is unavailable.'
        using errcode = '42501';
    end if;
  else
    if normalized_new_client_name is null then
      raise exception 'New client name is required.'
        using errcode = '22023';
    end if;

    insert into public.clients as created_client (
      practice_id,
      name,
      phone,
      email
    )
    values (
      selected_practice_id,
      normalized_new_client_name,
      normalized_new_client_phone,
      normalized_new_client_email
    )
    returning created_client.id into selected_client_id;
  end if;

  insert into public.cases as created_case (
    practice_id,
    client_id,
    case_number,
    cnr_number,
    court_name,
    case_type,
    title,
    status,
    filing_date,
    notes
  )
  values (
    selected_practice_id,
    selected_client_id,
    normalized_case_number,
    normalized_cnr_number,
    normalized_court_name,
    normalized_case_type,
    normalized_case_title,
    'active',
    filing_date,
    normalized_notes
  )
  returning created_case.id into created_case_id;

  return created_case_id;
end;
$$;

revoke execute on function public.create_case_with_client(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  uuid,
  text,
  text,
  text
) from public;

revoke execute on function public.create_case_with_client(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  uuid,
  text,
  text,
  text
) from anon;

grant execute on function public.create_case_with_client(
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  uuid,
  text,
  text,
  text
) to authenticated;

grant select on table public.cases, public.clients to authenticated;
