# The Desk — Office of Public Voice

MVP: draft → approve → publish workflow for managing social/press content
for high-profile clients (politicians, companies, celebrities).

## 1. Set up Supabase

1. Create a free project at https://supabase.com.
2. In your project, open SQL Editor → New query, paste in the contents
   of `supabase/schema.sql`, and run it.
3. Go to Authentication → Users → Add user and create a login for yourself.
4. Go to Project Settings → API and copy the Project URL and anon public key.

## 2. Configure the app

Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables
wherever you deploy (e.g. Vercel project settings).

## 3. Deploy on Vercel

1. Import this repo in Vercel.
2. Add the two environment variables above.
3. Deploy.

## What's here (v0.1)

- Sign-in gated app (Supabase auth)
- Principals list (seeded — edit in Supabase for now)
- Post queue: draft → pending → approved/rejected
- Role toggle (approver vs ghostwriter)
- Realtime updates

## Deliberately left out of v0.1

- Actual publishing to X/Facebook/Instagram
- Multi-step approval chains
- Sentiment/mention monitoring
- A UI for adding/editing principals
- M-Pesa billing / local pricing
