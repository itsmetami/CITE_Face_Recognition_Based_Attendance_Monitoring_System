-- Add Dean access and allow a Dean to manage staff profiles.
--
-- Run this migration in the Supabase SQL Editor. Create the initial Dean's
-- Auth user in Authentication > Users first, then insert that person's
-- profiles row as role='dean' using the SQL Editor. Only the project owner
-- should provision the first Dean account.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('teacher', 'secretary', 'dean'));

create or replace function public.is_dean()
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
      and p.role = 'dean'
      and p.is_active = true
  );
$$;

revoke all on function public.is_dean() from public;
grant execute on function public.is_dean() to authenticated;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name, role, is_active) on public.profiles to authenticated;
grant update (display_name, role, is_active) on public.profiles to authenticated;

drop policy if exists "staff can read own profile or secretary can read all"
  on public.profiles;
drop policy if exists "staff can read own profile or office admins can read all"
  on public.profiles;
drop policy if exists "deans can add teacher and secretary profiles"
  on public.profiles;
drop policy if exists "deans can update teacher and secretary profiles"
  on public.profiles;

create policy "staff can read own profile or office admins can read all"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_secretary())
    or (select public.is_dean())
  );

create policy "deans can add teacher and secretary profiles"
  on public.profiles
  for insert
  to authenticated
  with check (
    (select public.is_dean())
    and role in ('teacher', 'secretary')
  );

create policy "deans can update teacher and secretary profiles"
  on public.profiles
  for update
  to authenticated
  using (
    (select public.is_dean())
    and role in ('teacher', 'secretary')
  )
  with check (
    (select public.is_dean())
    and role in ('teacher', 'secretary')
  );

-- Staff removal is handled as deactivation by the trusted admin function so
-- attendance history stays linked to the original staff identity.
