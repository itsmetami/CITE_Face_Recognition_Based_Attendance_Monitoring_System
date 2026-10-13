-- Store short-lived office QR codes. Only the secretary and Dean can read
-- them, and authenticated staff create codes through the role-checked RPC.

create table if not exists public.office_qr_codes (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint office_qr_codes_expiration_check check (expires_at > created_at)
);

-- Keep office-only permissions tied to active accounts.
create or replace function public.is_secretary()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.user_id = (select auth.uid())
      and p.role = 'secretary'
      and p.is_active = true
  );
$$;

revoke all on function public.is_secretary() from public;
grant execute on function public.is_secretary() to authenticated;

create index if not exists office_qr_codes_expires_at_idx
  on public.office_qr_codes (expires_at desc);

alter table public.office_qr_codes enable row level security;

revoke all on public.office_qr_codes from anon, authenticated;
grant select on public.office_qr_codes to authenticated;

drop policy if exists "office staff can read QR codes"
  on public.office_qr_codes;

create policy "office staff can read QR codes"
  on public.office_qr_codes
  for select
  to authenticated
  using (
    (select public.is_secretary())
    or (select public.is_dean())
  );

drop function if exists public.create_office_qr_code();

create or replace function public.create_office_qr_code(p_force boolean default false)
returns table (token uuid, created_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_current public.office_qr_codes%rowtype;
  v_token uuid;
  v_expires_at timestamptz;
begin
  if auth.uid() is null
    or not ((select public.is_secretary()) or (select public.is_dean())) then
    raise exception 'Only the secretary or Dean can generate the office QR code.'
      using errcode = '42501';
  end if;

  -- Keep simultaneous refreshes on the office screen(s) in sync.
  perform pg_catalog.pg_advisory_xact_lock(918273, 1);
  v_now := clock_timestamp();

  select codes.*
  into v_current
  from public.office_qr_codes as codes
  where codes.expires_at > v_now
  order by codes.created_at desc
  limit 1;

  if found and not p_force then
    return query
    select v_current.token, v_current.created_at, v_current.expires_at;
    return;
  end if;

  -- A forced refresh invalidates the previous code immediately. Expired codes
  -- are already unusable and remain in the table for history.
  update public.office_qr_codes as codes
  set expires_at = v_now
  where codes.expires_at > v_now;

  v_token := gen_random_uuid();
  v_expires_at := v_now + interval '5 minutes';

  return query
  insert into public.office_qr_codes (token, created_by, created_at, expires_at)
  values (v_token, auth.uid(), v_now, v_expires_at)
  returning office_qr_codes.token,
    office_qr_codes.created_at,
    office_qr_codes.expires_at;
end;
$$;

revoke all on function public.create_office_qr_code(boolean) from public, anon;
grant execute on function public.create_office_qr_code(boolean) to authenticated;
