-- Step 1 schema. Run this once in the Supabase SQL Editor.
-- Change you@example.com to the owner's Google account before you run it. It is in 3 places.

-- Only the owner's Google account can create a user.
create or replace function public.only_allow_me()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from 'you@example.com' then
    raise exception 'This app is private.';
  end if;
  return new;
end;
$$;

drop trigger if exists only_allow_me on auth.users;
create trigger only_allow_me
  before insert on auth.users
  for each row execute function public.only_allow_me();

-- One row of app settings. The phone and the laptop read the same row.
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "owner only" on public.settings;
create policy "owner only" on public.settings
  for all
  to authenticated
  using (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com')
  with check (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com');
