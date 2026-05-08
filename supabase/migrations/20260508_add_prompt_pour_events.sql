create table if not exists public.prompt_pour_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time not null,
  end_time time,
  short_description text,
  meeting_link text,
  location_label text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prompt_pour_events is
  'Prompt & Pour Parlor Sessions events table. Prefixed for shared Supabase project safety.';

drop trigger if exists prompt_pour_events_set_updated_at on public.prompt_pour_events;
create trigger prompt_pour_events_set_updated_at
before update on public.prompt_pour_events
for each row
execute function public.prompt_pour_set_updated_at();

alter table public.prompt_pour_events enable row level security;

create policy prompt_pour_events_select_published_upcoming
on public.prompt_pour_events
for select
to anon, authenticated
using (published = true and event_date >= current_date);
