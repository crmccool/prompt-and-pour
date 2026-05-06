# Prompt & Pour

Initial scaffold for a private, password-gated web app with a speakeasy-inspired aesthetic and mock data only.

## Run locally

Because this is a simple static scaffold, you can run it with any static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Included routes/pages (client-rendered)

- Login screen
- Member home/dashboard
- House Pours gallery
- Share a Build form
- Project detail view
- Admin dashboard
- House Rules page

## Supabase setup (shared project safety)

Prompt & Pour is currently intended to use an **existing shared Supabase project** that is also used by Publications Lookup.

### Important warning

- Do **not** modify, rename, or remove unrelated Publications Lookup tables, functions, policies, buckets, auth settings, extensions, or schemas.
- Prompt & Pour database objects are intentionally prefixed with `prompt_pour_` to reduce risk in a shared project.

### Apply initial schema

1. Open the Supabase dashboard for the shared project.
2. Go to **SQL Editor**.
3. Open `supabase/prompt_pour_schema.sql` from this repository.
4. Paste the SQL into the editor and run it.

This first pass intentionally creates only one Prompt & Pour table: `public.prompt_pour_pours`.

## Notes

- Authentication is visual only (mock passphrase gate).
- Frontend remains mock/static in this pass (no live Supabase wiring yet).
- No real uploads yet (placeholder only).
- Data is mock data in `app.js`.
