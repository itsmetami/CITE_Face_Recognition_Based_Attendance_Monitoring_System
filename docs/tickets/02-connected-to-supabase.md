# 02 — Connected to Supabase

**What to build:** Connect the live app to Supabase and let a signed-in staff member read their profile and role.

**Blocked by:** 01.

**Status:** todo

- [x] Supabase environment variables are set locally and in Vercel.
- [ ] Staff can sign in with individual email/password accounts provisioned by the office.
- [x] The profile table stores each staff member’s display name and teacher or secretary role, with RLS enabled and explicit policies.
- [x] A signed-in staff member can read their own profile; the secretary can read staff profiles needed for office tasks.
- [ ] Works on the live URL.

Implementation is in place. The profile migration was run in the Supabase SQL Editor, and the environment variables are configured locally and in Vercel. A live sign-in using provisioned staff accounts remains to verify.
