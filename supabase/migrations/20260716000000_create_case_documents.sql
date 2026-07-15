create table public.documents (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  case_id uuid not null,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null,
  description text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (case_id, practice_id)
    references public.cases (id, practice_id)
    on delete cascade,
  constraint documents_file_name_check
    check (
      pg_catalog.length(pg_catalog.btrim(file_name)) > 0
      and pg_catalog.length(file_name) <= 255
      and file_name !~ '[/\\]'
    ),
  constraint documents_storage_path_check
    check (
      pg_catalog.length(pg_catalog.btrim(storage_path)) > 0
      and pg_catalog.length(storage_path) <= 1024
    ),
  constraint documents_mime_type_check
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png'
      )
    ),
  constraint documents_file_size_check
    check (file_size > 0 and file_size <= 10485760),
  constraint documents_description_check
    check (description is null or pg_catalog.length(description) <= 1000)
);

create index documents_practice_case_active_idx
on public.documents (practice_id, case_id, created_at desc)
where deleted_at is null;

create index documents_practice_active_size_idx
on public.documents (practice_id, file_size)
where deleted_at is null;

create index documents_uploaded_by_idx
on public.documents (uploaded_by);

alter table public.documents enable row level security;

create policy "Members can view active case documents"
on public.documents for select
to authenticated
using (
  deleted_at is null
  and public.is_practice_member(practice_id)
);

revoke all on table public.documents from anon;
revoke all on table public.documents from authenticated;
grant select on table public.documents to authenticated;

create function public.get_case_document_usage(target_case_id uuid)
returns table (
  active_case_documents bigint,
  active_practice_bytes bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_practice_id uuid;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  select c.practice_id
  into target_practice_id
  from public.cases as c
  inner join public.practice_members as pm
    on pm.practice_id = c.practice_id
   and pm.user_id = current_user_id
  where c.id = target_case_id
  limit 1;

  if target_practice_id is null then
    raise exception using
      errcode = '42501',
      message = 'case_unavailable';
  end if;

  return query
  select
    pg_catalog.count(*) filter (where d.case_id = target_case_id),
    coalesce(pg_catalog.sum(d.file_size), 0)::bigint
  from public.documents as d
  where d.practice_id = target_practice_id
    and d.deleted_at is null;
end;
$$;

create function public.check_case_document_upload(
  target_case_id uuid,
  incoming_file_size bigint
)
returns table (
  active_case_documents bigint,
  active_practice_bytes bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_case_documents bigint;
  current_practice_bytes bigint;
begin
  if incoming_file_size is null
     or incoming_file_size <= 0
     or incoming_file_size > 10485760 then
    raise exception using
      errcode = '22023',
      message = 'document_file_size_invalid';
  end if;

  select usage.active_case_documents, usage.active_practice_bytes
  into current_case_documents, current_practice_bytes
  from public.get_case_document_usage(target_case_id) as usage;

  if current_case_documents >= 25 then
    raise exception using
      errcode = 'P0001',
      message = 'case_document_limit_reached';
  end if;

  if current_practice_bytes + incoming_file_size > 524288000 then
    raise exception using
      errcode = 'P0001',
      message = 'practice_document_storage_limit_reached';
  end if;

  return query
  select current_case_documents, current_practice_bytes;
end;
$$;

create function public.can_upload_case_document_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  path_parts text[];
  path_practice_id uuid;
  path_case_id uuid;
begin
  if auth.uid() is null or object_name is null then
    return false;
  end if;

  path_parts := pg_catalog.string_to_array(object_name, '/');

  if coalesce(pg_catalog.array_length(path_parts, 1), 0) <> 4
     or path_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or path_parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or path_parts[3] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or pg_catalog.length(pg_catalog.btrim(path_parts[4])) = 0 then
    return false;
  end if;

  path_practice_id := path_parts[1]::uuid;
  path_case_id := path_parts[2]::uuid;

  return exists (
    select 1
    from public.cases as c
    inner join public.practice_members as pm
      on pm.practice_id = c.practice_id
     and pm.user_id = auth.uid()
    where c.id = path_case_id
      and c.practice_id = path_practice_id
  );
end;
$$;

create function public.can_read_case_document(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.documents as d
    inner join public.practice_members as pm
      on pm.practice_id = d.practice_id
     and pm.user_id = auth.uid()
    where d.storage_path = object_name
      and d.deleted_at is null
  );
$$;

create function public.can_remove_case_document_orphan(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.can_upload_case_document_path(object_name)
    and not exists (
      select 1
      from public.documents as d
      where d.storage_path = object_name
    );
$$;

create function public.create_case_document(
  document_id uuid,
  target_case_id uuid,
  uploaded_file_name text,
  object_path text,
  uploaded_mime_type text,
  uploaded_file_size bigint,
  document_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_practice_id uuid;
  expected_storage_path text;
  current_case_documents bigint;
  current_practice_bytes bigint;
  stored_owner_id text;
  stored_size_text text;
  stored_mime_type text;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if document_id is null
     or uploaded_file_name is null
     or pg_catalog.length(pg_catalog.btrim(uploaded_file_name)) = 0
     or pg_catalog.length(uploaded_file_name) > 255
     or uploaded_file_name ~ '[/\\]'
     or object_path is null
     or uploaded_mime_type not in (
       'application/pdf',
       'image/jpeg',
       'image/png'
     )
     or uploaded_file_size is null
     or uploaded_file_size <= 0
     or uploaded_file_size > 10485760
     or (
       document_description is not null
       and pg_catalog.length(document_description) > 1000
     ) then
    raise exception using
      errcode = '22023',
      message = 'document_metadata_invalid';
  end if;

  select c.practice_id
  into target_practice_id
  from public.cases as c
  inner join public.practice_members as pm
    on pm.practice_id = c.practice_id
   and pm.user_id = current_user_id
  where c.id = target_case_id
  limit 1;

  if target_practice_id is null then
    raise exception using
      errcode = '42501',
      message = 'case_unavailable';
  end if;

  expected_storage_path :=
    target_practice_id::text
    || '/'
    || target_case_id::text
    || '/'
    || document_id::text
    || '/'
    || uploaded_file_name;

  if object_path <> expected_storage_path then
    raise exception using
      errcode = '22023',
      message = 'document_storage_path_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_practice_id::text, 0)
  );

  select usage.active_case_documents, usage.active_practice_bytes
  into current_case_documents, current_practice_bytes
  from public.get_case_document_usage(target_case_id) as usage;

  if current_case_documents >= 25 then
    raise exception using
      errcode = 'P0001',
      message = 'case_document_limit_reached';
  end if;

  if current_practice_bytes + uploaded_file_size > 524288000 then
    raise exception using
      errcode = 'P0001',
      message = 'practice_document_storage_limit_reached';
  end if;

  select
    storage_object.owner_id,
    storage_object.metadata ->> 'size',
    storage_object.metadata ->> 'mimetype'
  into stored_owner_id, stored_size_text, stored_mime_type
  from storage.objects as storage_object
  where storage_object.bucket_id = 'case-documents'
    and storage_object.name = object_path
  limit 1;

  if stored_owner_id is null
     or stored_owner_id <> current_user_id::text
     or stored_size_text is null
     or stored_size_text !~ '^[0-9]+$'
     or stored_mime_type is null
     or stored_mime_type <> uploaded_mime_type then
    raise exception using
      errcode = '22023',
      message = 'document_storage_object_invalid';
  end if;

  if stored_size_text::bigint <> uploaded_file_size then
    raise exception using
      errcode = '22023',
      message = 'document_storage_object_invalid';
  end if;

  insert into public.documents (
    id,
    practice_id,
    case_id,
    uploaded_by,
    file_name,
    storage_path,
    mime_type,
    file_size,
    description
  )
  values (
    document_id,
    target_practice_id,
    target_case_id,
    current_user_id,
    uploaded_file_name,
    object_path,
    uploaded_mime_type,
    uploaded_file_size,
    nullif(pg_catalog.btrim(document_description), '')
  );

  return document_id;
end;
$$;

create function public.trash_case_document(
  target_case_id uuid,
  target_document_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  trashed_document_id uuid;
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  update public.documents as d
  set deleted_at = pg_catalog.now()
  from public.practice_members as pm
  where d.id = target_document_id
    and d.case_id = target_case_id
    and d.deleted_at is null
    and pm.practice_id = d.practice_id
    and pm.user_id = current_user_id
  returning d.id into trashed_document_id;

  if trashed_document_id is null then
    raise exception using
      errcode = '42501',
      message = 'document_unavailable';
  end if;

  return trashed_document_id;
end;
$$;

revoke all on function public.get_case_document_usage(uuid) from public;
revoke all on function public.check_case_document_upload(uuid, bigint) from public;
revoke all on function public.can_upload_case_document_path(text) from public;
revoke all on function public.can_read_case_document(text) from public;
revoke all on function public.can_remove_case_document_orphan(text) from public;
revoke all on function public.create_case_document(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text
) from public;
revoke all on function public.trash_case_document(uuid, uuid) from public;

grant execute on function public.get_case_document_usage(uuid) to authenticated;
grant execute on function public.check_case_document_upload(uuid, bigint) to authenticated;
grant execute on function public.can_upload_case_document_path(text) to authenticated;
grant execute on function public.can_read_case_document(text) to authenticated;
grant execute on function public.can_remove_case_document_orphan(text) to authenticated;
grant execute on function public.create_case_document(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text
) to authenticated;
grant execute on function public.trash_case_document(uuid, uuid) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'case-documents',
  'case-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members can upload case documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'case-documents'
  and public.can_upload_case_document_path(name)
);

create policy "Members can read active case documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'case-documents'
  and public.can_read_case_document(name)
);

create policy "Members can remove document upload orphans"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'case-documents'
  and public.can_remove_case_document_orphan(name)
);
