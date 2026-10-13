-- Staff profiles for teacher and secretary roles.
--
-- Create staff accounts in Supabase Auth first, then add their matching
-- user_id, display_name and role to this table through the Supabase SQL
-- Editor. Authenticated staff cannot create profiles or change their role.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('teacher', 'secretary'))
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- This narrowly scoped helper lets the read policy check a secretary's role
-- without recursively invoking the profiles table's own RLS policy.
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
  );
$$;

revoke all on function public.is_secretary() from public;
grant execute on function public.is_secretary() to authenticated;

drop policy if exists "staff can read own profile or secretary can read all"
  on public.profiles;

create policy "staff can read own profile or secretary can read all"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_secretary())
  );

-- No insert or update policy is granted to authenticated users. Profile rows
-- and roles are provisioned by the office using the Supabase project admin.
