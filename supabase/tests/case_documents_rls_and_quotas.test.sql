begin;

set local statement_timeout = '15s';

select '1..19';

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'documents-a@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Documents Practice A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'documents-b@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Documents Practice B"}',
    now(),
    now()
  );

insert into public.practices (id, name, created_by)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Documents Practice A',
    '33333333-3333-4333-8333-333333333333'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'Documents Practice B',
    '44444444-4444-4444-8444-444444444444'
  );

insert into public.practice_members (practice_id, user_id, role)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '33333333-3333-4333-8333-333333333333',
    'owner'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '44444444-4444-4444-8444-444444444444',
    'owner'
  );

insert into public.cases (
  id,
  practice_id,
  case_number,
  court_name,
  title,
  status
)
values
  (
    'caaa0000-0000-4000-8000-000000000001',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'DOC-A',
    'Test Court',
    'Practice A Document Case',
    'active'
  ),
  (
    'caaa0000-0000-4000-8000-000000000002',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'DOC-A2',
    'Test Court',
    'Practice A Upload Target',
    'active'
  ),
  (
    'cbbb0000-0000-4000-8000-000000000001',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'DOC-B1',
    'Test Court',
    'Practice B Storage Source One',
    'active'
  ),
  (
    'cbbb0000-0000-4000-8000-000000000002',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'DOC-B2',
    'Test Court',
    'Practice B Storage Source Two',
    'active'
  ),
  (
    'cbbb0000-0000-4000-8000-000000000003',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'DOC-B3',
    'Test Court',
    'Practice B Upload Target',
    'active'
  );

insert into public.documents (
  id,
  practice_id,
  case_id,
  uploaded_by,
  file_name,
  storage_path,
  mime_type,
  file_size
)
select
  gen_random_uuid(),
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'caaa0000-0000-4000-8000-000000000001',
  '33333333-3333-4333-8333-333333333333',
  'practice-a-' || fixture_number || '.pdf',
  'fixture/practice-a/' || fixture_number,
  'application/pdf',
  1
from generate_series(1, 25) as fixture_number;

insert into public.documents (
  id,
  practice_id,
  case_id,
  uploaded_by,
  file_name,
  storage_path,
  mime_type,
  file_size
)
select
  gen_random_uuid(),
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  case
    when fixture_number <= 25
      then 'cbbb0000-0000-4000-8000-000000000001'::uuid
    else 'cbbb0000-0000-4000-8000-000000000002'::uuid
  end,
  '44444444-4444-4444-8444-444444444444',
  'practice-b-' || fixture_number || '.pdf',
  'fixture/practice-b/' || fixture_number,
  'application/pdf',
  10485760
from generate_series(1, 50) as fixture_number;

with selected_document as (
  select id
  from public.documents
  where practice_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  order by created_at, id
  limit 1
), updated_document as (
  update public.documents as d
  set storage_path =
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd/'
    || d.case_id::text
    || '/'
    || d.id::text
    || '/practice-b.pdf'
  from selected_document
  where d.id = selected_document.id
  returning d.storage_path
)
insert into storage.objects (bucket_id, name, owner_id, metadata)
select
  'case-documents',
  storage_path,
  '44444444-4444-4444-8444-444444444444',
  '{"size":10485760,"mimetype":"application/pdf"}'::jsonb
from updated_document;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'case-documents'
      and public is false
      and file_size_limit = 10485760
      and allowed_mime_types @> array[
        'application/pdf',
        'image/jpeg',
        'image/png'
      ]::text[]
      and pg_catalog.cardinality(allowed_mime_types) = 3
  ) then
    raise exception 'Private bucket limit assertion failed';
  end if;
end;
$$;
select 'ok 1 - The private bucket has exact size and MIME limits';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.documents) <> 25 then
    raise exception 'Practice A document visibility assertion failed';
  end if;
end;
$$;
select 'ok 2 - Practice A sees only its active documents';

do $$
begin
  if (
    select count(*)
    from public.documents
    where practice_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ) <> 0 then
    raise exception 'Practice A cross-practice read assertion failed';
  end if;
end;
$$;
select 'ok 3 - Practice A cannot read Practice B documents';

do $$
begin
  if public.can_upload_case_document_path(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd/cbbb0000-0000-4000-8000-000000000003/99999999-9999-4999-8999-999999999999/test.pdf'
  ) then
    raise exception 'Practice A cross-practice upload path assertion failed';
  end if;
end;
$$;
select 'ok 4 - Practice A cannot upload into a Practice B case path';

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'case-documents',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd/cbbb0000-0000-4000-8000-000000000003/99999999-9999-4999-8999-999999999999/test.pdf',
      '33333333-3333-4333-8333-333333333333',
      '{"size":10,"mimetype":"application/pdf"}'::jsonb
    );
    raise exception 'Expected storage upload RLS rejection was not raised';
  exception
    when sqlstate '42501' then
      if sqlerrm not like 'new row violates row-level security policy%' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 5 - Storage RLS rejects a Practice A upload to Practice B';

do $$
begin
  if public.can_read_case_document('fixture/practice-b/1') then
    raise exception 'Practice A cross-practice storage read assertion failed';
  end if;
end;
$$;
select 'ok 6 - Practice A cannot read a Practice B storage object path';

do $$
begin
  if (
    select count(*)
    from storage.objects
    where bucket_id = 'case-documents'
  ) <> 0 then
    raise exception 'Practice A storage object read policy assertion failed';
  end if;
end;
$$;
select 'ok 7 - Storage RLS hides Practice B objects from Practice A';

do $$
begin
  begin
    perform *
    from public.get_case_document_usage(
      'cbbb0000-0000-4000-8000-000000000003'
    );
    raise exception 'Expected case_unavailable was not raised';
  exception
    when sqlstate '42501' then
      if sqlerrm <> 'case_unavailable' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 8 - Practice A cannot inspect Practice B document usage';

do $$
begin
  begin
    perform public.create_case_document(
      '99999999-9999-4999-8999-999999999999',
      'caaa0000-0000-4000-8000-000000000001',
      'unsafe.txt',
      'invalid',
      'text/plain',
      10,
      null
    );
    raise exception 'Expected document_metadata_invalid was not raised';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'document_metadata_invalid' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 9 - Unsupported MIME types are rejected server-side';

do $$
begin
  begin
    perform *
    from public.check_case_document_upload(
      'caaa0000-0000-4000-8000-000000000001',
      10485761
    );
    raise exception 'Expected document_file_size_invalid was not raised';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'document_file_size_invalid' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 10 - Files larger than 10 MB are rejected server-side';

do $$
begin
  begin
    perform *
    from public.check_case_document_upload(
      'caaa0000-0000-4000-8000-000000000001',
      1
    );
    raise exception 'Expected case_document_limit_reached was not raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'case_document_limit_reached' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 11 - A 26th active case document is rejected';

do $$
declare
  created_document_id uuid;
begin
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (
    'case-documents',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc/caaa0000-0000-4000-8000-000000000002/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/valid.pdf',
    '33333333-3333-4333-8333-333333333333',
    '{"size":6,"mimetype":"application/pdf"}'::jsonb
  );

  select public.create_case_document(
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'caaa0000-0000-4000-8000-000000000002',
    'valid.pdf',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc/caaa0000-0000-4000-8000-000000000002/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/valid.pdf',
    'application/pdf',
    6,
    'Valid upload fixture'
  )
  into created_document_id;

  if created_document_id <> 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' then
    raise exception 'Valid document creation assertion failed';
  end if;
end;
$$;
select 'ok 12 - A valid owned storage object can be registered';

do $$
declare
  trashed_document_id uuid;
  case_documents bigint;
  practice_bytes bigint;
begin
  select public.trash_case_document(
    'caaa0000-0000-4000-8000-000000000002',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
  )
  into trashed_document_id;

  select usage.active_case_documents, usage.active_practice_bytes
  into case_documents, practice_bytes
  from public.get_case_document_usage(
    'caaa0000-0000-4000-8000-000000000002'
  ) as usage;

  if trashed_document_id <> 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
     or case_documents <> 0
     or practice_bytes <> 25 then
    raise exception 'Trash quota exclusion assertion failed';
  end if;
end;
$$;
select 'ok 13 - Trashed documents stop counting toward active quotas';

do $$
begin
  if (
    select count(*)
    from storage.objects
    where name = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/caaa0000-0000-4000-8000-000000000002/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/valid.pdf'
  ) <> 0 then
    raise exception 'Trashed storage object visibility assertion failed';
  end if;
end;
$$;
select 'ok 14 - Trashed storage objects are hidden from normal reads';

do $$
begin
  if public.can_remove_case_document_orphan(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc/caaa0000-0000-4000-8000-000000000002/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa/valid.pdf'
  ) then
    raise exception 'Registered object orphan cleanup assertion failed';
  end if;
end;
$$;
select 'ok 15 - Registered trashed objects cannot be physically deleted';

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);

do $$
begin
  begin
    perform *
    from public.check_case_document_upload(
      'cbbb0000-0000-4000-8000-000000000003',
      1
    );
    raise exception 'Expected practice storage limit error was not raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'practice_document_storage_limit_reached' then
        raise;
      end if;
  end;
end;
$$;
select 'ok 16 - An upload above the 500 MB practice quota is rejected';

do $$
begin
  if (
    select count(*)
    from public.documents
    where practice_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) <> 0 then
    raise exception 'Practice B cross-practice read assertion failed';
  end if;
end;
$$;
select 'ok 17 - Practice B cannot read Practice A documents';

do $$
begin
  if (
    select count(*)
    from storage.objects
    where bucket_id = 'case-documents'
  ) <> 1 then
    raise exception 'Practice B storage object read policy assertion failed';
  end if;
end;
$$;
select 'ok 18 - Storage RLS allows Practice B to read its active object';

reset role;

do $$
begin
  if (
    select count(*)
    from storage.objects
    where bucket_id = 'case-documents'
  ) <> 2
     or not exists (
       select 1
       from public.documents
       where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
         and deleted_at is not null
     ) then
    raise exception 'Soft-delete persistence assertion failed';
  end if;
end;
$$;
select 'ok 19 - Trash keeps the storage object and soft-deleted metadata row';

rollback;
