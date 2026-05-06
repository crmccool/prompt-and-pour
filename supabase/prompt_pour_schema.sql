-- Prompt & Pour schema bootstrap for a SHARED Supabase project.
--
-- IMPORTANT SAFETY CONTEXT:
-- This Supabase project is shared with another app (Publications Lookup).
-- To avoid impacting unrelated app data, every object introduced here is
-- prefixed with `prompt_pour_` and scoped only to Prompt & Pour.
--
-- Do not rename or modify existing non-prefixed objects in this shared project.

create table if not exists public.prompt_pour_pours (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  creator_name text not null,
  creator_email text,
  categories text[] not null default '{}',
  status text not null,
  tools_used text[] not null default '{}',
  problem_statement text,
  ai_use text,
  lessons_learned text,
  help_wanted text,
  reusable_bits text,
  links jsonb not null default '[]'::jsonb,
  screenshot_url text,
  reuse_permission text,
  approved boolean not null default false,
  featured boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_pour_pours_status_check
    check (status in ('Idea', 'In Progress', 'In Use', 'Needs Help'))
);

comment on table public.prompt_pour_pours is
  'Prompt & Pour House Pours table. Intentionally prefixed because this Supabase project is shared.';

-- Keep updated_at maintenance local and prefixed for shared-project safety.
create or replace function public.prompt_pour_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompt_pour_pours_set_updated_at on public.prompt_pour_pours;

create trigger prompt_pour_pours_set_updated_at
before update on public.prompt_pour_pours
for each row
execute function public.prompt_pour_set_updated_at();

alter table public.prompt_pour_pours enable row level security;

-- Public/client reads are limited to approved, non-archived rows only.
create policy prompt_pour_pours_select_approved
on public.prompt_pour_pours
for select
to anon, authenticated
using (approved = true and archived = false);

-- Public/client submissions are allowed, but must remain unapproved/unfeatured/unarchived.
create policy prompt_pour_pours_insert_submission
on public.prompt_pour_pours
for insert
to anon, authenticated
with check (
  approved = false
  and featured = false
  and archived = false
);

-- Intentionally no broad public update/delete policies.
-- Admin moderation should be implemented later via secure server-side logic or Edge Functions.
