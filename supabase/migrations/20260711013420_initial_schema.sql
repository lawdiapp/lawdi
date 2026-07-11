create extension if not exists pgcrypto;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.practice_members (
  practice_id uuid not null references public.practices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'advocate', 'assistant')),
  primary key (practice_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, practice_id)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  client_id uuid,
  case_number text not null,
  cnr_number text,
  court_name text not null,
  case_type text,
  title text not null,
  status text not null,
  filing_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, practice_id),
  foreign key (client_id, practice_id)
    references public.clients (id, practice_id)
    on delete restrict
);

create table public.hearings (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  case_id uuid not null,
  hearing_date date not null,
  hearing_time time,
  court_name text,
  purpose text,
  outcome text,
  next_hearing_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (case_id, practice_id)
    references public.cases (id, practice_id)
    on delete cascade
);

create index practices_created_by_idx on public.practices (created_by);
create index practice_members_user_id_idx on public.practice_members (user_id);
create index clients_practice_id_name_idx on public.clients (practice_id, name);
create index cases_practice_id_client_id_idx on public.cases (practice_id, client_id);
create index cases_practice_id_case_number_idx on public.cases (practice_id, case_number);
create index cases_practice_id_cnr_number_idx
  on public.cases (practice_id, cnr_number)
  where cnr_number is not null;
create index cases_practice_id_status_idx on public.cases (practice_id, status);
create index hearings_practice_id_case_id_idx on public.hearings (practice_id, case_id);
create index hearings_practice_id_hearing_date_idx
  on public.hearings (practice_id, hearing_date);
create index hearings_practice_id_next_hearing_date_idx
  on public.hearings (practice_id, next_hearing_date)
  where next_hearing_date is not null;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger practices_set_updated_at
before update on public.practices
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

create trigger hearings_set_updated_at
before update on public.hearings
for each row execute function public.set_updated_at();

create function public.is_practice_member(target_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members
    where practice_id = target_practice_id
      and user_id = (select auth.uid())
  );
$$;

create function public.is_practice_owner(target_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practice_members
    where practice_id = target_practice_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

create function public.is_practice_creator(target_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.practices
    where id = target_practice_id
      and created_by = (select auth.uid())
  );
$$;

revoke all on function public.is_practice_member(uuid) from public;
revoke all on function public.is_practice_owner(uuid) from public;
revoke all on function public.is_practice_creator(uuid) from public;
grant execute on function public.is_practice_member(uuid) to authenticated;
grant execute on function public.is_practice_owner(uuid) to authenticated;
grant execute on function public.is_practice_creator(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.practices enable row level security;
alter table public.practice_members enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.hearings enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Members can view practices"
on public.practices for select
to authenticated
using (public.is_practice_member(id));

create policy "Users can create practices"
on public.practices for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "Members can update practices"
on public.practices for update
to authenticated
using (public.is_practice_member(id))
with check (public.is_practice_member(id));

create policy "Owners can delete practices"
on public.practices for delete
to authenticated
using (public.is_practice_owner(id));

create policy "Members can view practice memberships"
on public.practice_members for select
to authenticated
using (public.is_practice_member(practice_id));

create policy "Owners can add practice members"
on public.practice_members for insert
to authenticated
with check (
  public.is_practice_owner(practice_id)
  or (
    user_id = (select auth.uid())
    and role = 'owner'
    and public.is_practice_creator(practice_id)
  )
);

create policy "Owners can update practice members"
on public.practice_members for update
to authenticated
using (public.is_practice_owner(practice_id))
with check (public.is_practice_owner(practice_id));

create policy "Owners can remove practice members"
on public.practice_members for delete
to authenticated
using (public.is_practice_owner(practice_id));

create policy "Members can view clients"
on public.clients for select
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can create clients"
on public.clients for insert
to authenticated
with check (public.is_practice_member(practice_id));

create policy "Members can update clients"
on public.clients for update
to authenticated
using (public.is_practice_member(practice_id))
with check (public.is_practice_member(practice_id));

create policy "Members can delete clients"
on public.clients for delete
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can view cases"
on public.cases for select
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can create cases"
on public.cases for insert
to authenticated
with check (public.is_practice_member(practice_id));

create policy "Members can update cases"
on public.cases for update
to authenticated
using (public.is_practice_member(practice_id))
with check (public.is_practice_member(practice_id));

create policy "Members can delete cases"
on public.cases for delete
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can view hearings"
on public.hearings for select
to authenticated
using (public.is_practice_member(practice_id));

create policy "Members can create hearings"
on public.hearings for insert
to authenticated
with check (public.is_practice_member(practice_id));

create policy "Members can update hearings"
on public.hearings for update
to authenticated
using (public.is_practice_member(practice_id))
with check (public.is_practice_member(practice_id));

create policy "Members can delete hearings"
on public.hearings for delete
to authenticated
using (public.is_practice_member(practice_id));
