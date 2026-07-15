alter table public.hearings
add column next_hearing_time time;

alter table public.hearings
add constraint hearings_next_time_requires_date_check
check (next_hearing_time is null or next_hearing_date is not null);

alter table public.hearings
add constraint hearings_next_date_not_before_current_check
check (next_hearing_date is null or next_hearing_date >= hearing_date);

create unique index hearings_practice_case_date_time_unique_idx
on public.hearings (practice_id, case_id, hearing_date, hearing_time)
nulls not distinct;
