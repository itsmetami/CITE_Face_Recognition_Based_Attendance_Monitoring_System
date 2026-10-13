# 02 — Connected to Supabase

**What to build:** Connect the live app to Supabase, support teacher/secretary/Dean roles, and let the Dean manage teacher and secretary accounts.

**Blocked by:** 01.

**Status:** todo

- [ ] Supabase environment variables are set locally and in Vercel.
- [ ] Staff can sign in with individual email/password accounts provisioned by the office.
- [ ] The Dean can sign in as the super administrator; no one can promote themselves to Dean.
- [ ] The Dean can create, update, and deactivate teacher/secretary accounts; account credentials are handled by a server-side Supabase Edge Function.
- [x] The profile table stores each staff member’s display name and teacher, secretary, or Dean role, with RLS enabled and explicit policies.
- [x] A signed-in staff member can read their own profile; the secretary can read staff profiles needed for office tasks.
- [x] Dean profile management uses explicit RLS policies and cannot modify or delete Dean accounts.
- [ ] Works on the live URL.

The original sign-in/profile implementation is pushed to `main` and the live sign-in page was confirmed. Migrations `002` and `003` were run in the Supabase SQL Editor, and the `admin-users` Edge Function is deployed in the Supabase Dashboard. The Dean UI and its function integration are still local changes and have not been released to Vercel. `npm run build` failed twice with the same Turbopack process error; per project rules, do not retry until that error is understood. Keep the ticket `todo` until a successful release and live Dean-flow verification. Supabase injects the function secret at runtime; do not add it to Vercel or `.env`.
