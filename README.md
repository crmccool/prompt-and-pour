# Prompt & Pour

Private static HTML/CSS/JS app for sharing practical AI builds.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Supabase wiring (basic read + submission)

This app now supports browser-side Supabase for:

- Reading approved, non-archived pours from `public.prompt_pour_pours`.
- Submitting new pours into `public.prompt_pour_pours` for moderation.

If Supabase config is missing, the app automatically falls back to mock data/local behavior.

## Local config

1. Copy the example config file:

   ```bash
   cp supabase.config.example.js supabase.config.local.js
   ```

2. Edit `supabase.config.local.js` with **public** client values only:

   - Supabase project URL
   - Supabase anon public key

3. Never place service role keys in this frontend app.

`supabase.config.local.js` is gitignored and should not be committed.

## Vercel config

Because this is a static app, provide the public config values at build/deploy time by generating `supabase.config.local.js` (or equivalent static file injection) with:

- `window.PROMPT_POUR_SUPABASE_CONFIG.url`
- `window.PROMPT_POUR_SUPABASE_CONFIG.anonKey`

Do not hardcode real keys in tracked files.

## Submission behavior

- New submissions are inserted with:
  - `approved: false`
  - `featured: false`
  - `archived: false`
- UI confirmation: “Your pour has been sent behind the bar for review.”
- Submissions do not appear publicly until approved (RLS/filters keep unapproved rows hidden).

## Shared Supabase project safety

This project shares a Supabase instance with Publications Lookup.

- Do **not** change unrelated tables, functions, policies, storage buckets, auth config, or schemas.
- Prompt & Pour objects are scoped to `prompt_pour_*` naming.

## Current non-goals (still mock)

- Real authentication (still mock passphrase + mock role selector).
- Real admin moderation actions (no client-side approve/update/delete yet).
- Real file uploads.
