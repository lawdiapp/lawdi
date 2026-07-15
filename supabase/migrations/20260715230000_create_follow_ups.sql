create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  case_id uuid not null,
  title text not null,
  due_date date,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (case_id, practice_id)
    references public.cases (id, practice_id)
    on delete cascade,
  constraint follow_ups_title_check
    check (
      pg_catalog.length(pg_catalog.btrim(title)) > 0
      and pg_catalog.length(title) <= 300
    )
);

create index follow_ups_practice_case_pending_idx
on public.follow_ups (practice_id, case_id, due_date, created_at)
where completed_at is null;

create index follow_ups_practice_due_date_pending_idx
on public.follow_ups (practice_id, due_date)
where completed_at is null and due_date is not null;

create index follow_ups_practice_reminder_at_pending_idx
on public.follow_ups (practice_id, reminder_at)
where completed_at is null and reminder_at is not null;

create index follow_ups_case_completed_at_idx
on public.follow_ups (case_id, completed_at desc)
where completed_at is not null;

create trigger follow_ups_set_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

alter table public.follow_ups enable row level security;

create policy "Members can view follow-ups"
on public.follow_ups for select
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can create follow-ups"
on public.follow_ups for insert
to authenticated
with check (
  public.is_practice_member(practice_id)
  and created_by = (select auth.uid())
);

create policy "Members can complete follow-ups"
on public.follow_ups for update
to authenticated
using (public.is_practice_member(practice_id))
with check (public.is_practice_member(practice_id));

create policy "Members can delete follow-ups"
on public.follow_ups for delete
to authenticated
using (public.is_practice_member(practice_id));

revoke all on table public.follow_ups from anon;
revoke all on table public.follow_ups from authenticated;

grant select on table public.follow_ups to authenticated;
grant insert (
  practice_id,
  case_id,
  title,
  due_date,
  reminder_at,
  created_by
) on table public.follow_ups to authenticated;
grant update (completed_at) on table public.follow_ups to authenticated;
