-- Study Tracker cloud sync schema.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.study_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.study_data enable row level security;

-- Each signed-in user can only see and change their own row.
drop policy if exists "Users read own data" on public.study_data;
create policy "Users read own data" on public.study_data
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own data" on public.study_data;
create policy "Users insert own data" on public.study_data
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own data" on public.study_data;
create policy "Users update own data" on public.study_data
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own data" on public.study_data;
create policy "Users delete own data" on public.study_data
  for delete using ((select auth.uid()) = user_id);
