begin;

set local statement_timeout = '10s';

select extensions.plan(6);

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
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'follow-ups-a@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Practice A Test"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'follow-ups-b@example.test',
    '',
    now(),
    '{}',
    '{"full_name":"Practice B Test"}',
    now(),
    now()
  );

insert into public.practices (id, name, created_by)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Follow-up Practice A',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Follow-up Practice B',
    '22222222-2222-4222-8222-222222222222'
  );

insert into public.practice_members (practice_id, user_id, role)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'owner'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
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
    'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'RLS-A',
    'Test Court',
    'Practice A Case',
    'active'
  ),
  (
    'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'RLS-B',
    'Test Court',
    'Practice B Case',
    'active'
  );

insert into public.follow_ups (
  id,
  practice_id,
  case_id,
  title,
  due_date,
  created_by
)
values
  (
    'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Practice A Follow-up',
    current_date,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Practice B Follow-up',
    current_date,
    '22222222-2222-4222-8222-222222222222'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(
  (select count(*) from public.follow_ups),
  1::bigint,
  'Practice A sees only its follow-ups'
);

select extensions.is(
  (
    select count(*)
    from public.follow_ups
    where id = 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  0::bigint,
  'Practice A cannot read a Practice B follow-up'
);

with changed as (
  update public.follow_ups
  set completed_at = now()
  where id = 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  returning id
)
select extensions.is(
  (select count(*) from changed),
  0::bigint,
  'Practice A cannot complete a Practice B follow-up'
);

select extensions.throws_ok(
  $$
    insert into public.follow_ups (
      practice_id,
      case_id,
      title,
      created_by
    )
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Cross-practice insert',
      '11111111-1111-4111-8111-111111111111'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "follow_ups"',
  'Practice A cannot create a follow-up for a Practice B case'
);

select extensions.throws_ok(
  $$
    insert into public.follow_ups (
      practice_id,
      case_id,
      title,
      created_by
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Wrong creator insert',
      '22222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "follow_ups"',
  'A member cannot spoof the follow-up creator'
);

with changed as (
  update public.follow_ups
  set completed_at = now()
  where id = 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  returning id
)
select extensions.is(
  (select count(*) from changed),
  1::bigint,
  'Practice A can complete its own follow-up'
);

select * from extensions.finish();

rollback;
