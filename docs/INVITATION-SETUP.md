# Accepting Supabase staff invitations

The app provides `/auth/accept` for invitees to set their own password. Supabase's invite link signs the invitee in temporarily; the page uses that session to save the password, then opens the staff account.

## Supabase settings

In **Authentication → URL Configuration**:

1. Set **Site URL** to `https://cite-face-recognition-based-attenda.vercel.app`.
2. Add `https://cite-face-recognition-based-attenda.vercel.app/auth/accept` to **Redirect URLs**.
3. Keep `http://localhost:3000/**` in Redirect URLs for local development.

When sending an invitation, use `https://cite-face-recognition-based-attenda.vercel.app/auth/accept` as its redirect URL if Supabase presents that option. Links that redirect to the production app root are also forwarded to `/auth/accept` by the app.

Changing these settings does not rewrite invitations that have already been sent. After changing them, send a new invitation; an earlier link pointing at localhost will still open localhost.
