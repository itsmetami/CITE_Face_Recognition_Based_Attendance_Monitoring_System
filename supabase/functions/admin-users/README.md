# Deploy `admin-users`

1. In the Supabase Dashboard, open **Edge Functions** and create a function named `admin-users`.
2. Replace its entry file with [`index.ts`](./index.ts) and deploy it.
3. Keep JWT verification enabled. The function checks the caller's session and requires an active `dean` profile before it performs any staff operation.

The function reads Supabase's injected `SUPABASE_SECRET_KEYS` at runtime for Auth Admin operations. Do not paste a secret key into this repository, Vercel, or browser code. Supabase documents dashboard deployment and function secrets in its [Edge Functions guides](https://supabase.com/docs/guides/functions/quickstart-dashboard) and [secrets guide](https://supabase.com/docs/guides/functions/secrets).

The browser origin allowlist in `index.ts` includes the production Vercel URL and `http://localhost:3000` for local development. Update that allowlist if the production domain changes.
