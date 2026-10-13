-- Daily teacher attendance. The first valid scan records time-in and the
-- second valid scan records time-out. All timestamps come from the database.

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(user_id) on delete restrict,
  work_date date not null,
  time_in timestamptz not null,
  time_out timestamptz,
  time_out_status text
    check (time_out_status is null or time_out_status in ('complete', 'forgot_time_out')),
  correction_note text,
  corrected_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (teacher_id, work_date),
  check (
    (time_out is null and (time_out_status is null or time_out_status = 'forgot_time_out'))
    or (time_out is not null and time_out_status = 'complete')
  )
);

create index if not exists attendance_records_work_date_idx
  on public.attendance_records (work_date desc, time_in desc);

alter table public.attendance_records enable row level security;
revoke all on public.attendance_records from anon, authenticated;
grant select on public.attendance_records to authenticated;

drop policy if exists "teachers see own attendance and office admins see all"
  on public.attendance_records;
create policy "teachers see own attendance and office admins see all"
  on public.attendance_records
  for select
  to authenticated
  using (
    teacher_id = (select auth.uid())
    or (select public.is_secretary())
    or (select public.is_dean())
  );

-- The browser cannot directly create or edit attendance. This RPC validates
-- the signed-in teacher and current office QR, then records a server timestamp.
create or replace function public.record_attendance_scan(p_token uuid)
returns table (
  record_id uuid,
  work_date date,
  time_in timestamptz,
  time_out timestamptz,
  scan_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_work_date date := (v_now at time zone 'Asia/Manila')::date;
  v_record public.attendance_records%rowtype;
begin
  if v_user_id is null then
    raise exception 'Sign in with your teacher account before scanning.'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.user_id = v_user_id
      and p.role = 'teacher'
      and p.is_active = true
  ) then
    raise exception 'Only an active teacher account can record attendance.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.office_qr_codes as q
    where q.token = p_token
      and q.expires_at > v_now
  ) then
    raise exception 'This office QR code is invalid or has expired. Scan the current code.'
      using errcode = '22023';
  end if;

  -- Serialize scans for this teacher and workday so two rapid scans cannot
  -- both become time-in or overwrite each other.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || v_work_date::text, 0)
  );

  select a.*
    into v_record
  from public.attendance_records as a
  where a.teacher_id = v_user_id
    and a.work_date = v_work_date
  for update;

  if not found then
    insert into public.attendance_records (teacher_id, work_date, time_in)
    values (v_user_id, v_work_date, v_now)
    returning * into v_record;

    return query select v_record.id, v_record.work_date, v_record.time_in,
      v_record.time_out, 'time_in'::text;
    return;
  end if;

  if v_record.time_out is null then
    update public.attendance_records as a
      set time_out = v_now,
          time_out_status = 'complete',
          updated_at = v_now
    where a.id = v_record.id
    returning * into v_record;

    return query select v_record.id, v_record.work_date, v_record.time_in,
      v_record.time_out, 'time_out'::text;
    return;
  end if;

  raise exception 'You already recorded both time-in and time-out for today.'
    using errcode = '23505';
end;
$$;

revoke all on function public.record_attendance_scan(uuid) from public, anon;
grant execute on function public.record_attendance_scan(uuid) to authenticated;
