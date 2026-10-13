# 02 — Connected to Supabase

**What to build:** Connect the live app to Supabase and let a signed-in staff member read their profile and role.

**Blocked by:** 01.

**Status:** todo

- [ ] Supabase environment variables are set locally and in Vercel.
- [ ] Staff can sign in with individual email/password accounts provisioned by the office.
- [x] The profile table stores each staff member’s display name and teacher or secretary role, with RLS enabled and explicit policies.
- [x] A signed-in staff member can read their own profile; the secretary can read staff profiles needed for office tasks.
- [ ] Works on the live URL.

Implementation is pushed to `main`. The profile migration was run in the Supabase SQL Editor. The local `.env.local` exists; Vercel environment settings and a live sign-in still need verification. The current live URL continues to show the starter screen after the push.
