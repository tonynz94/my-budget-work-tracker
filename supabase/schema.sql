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

-- Step 2. One work record for one day. Times are minutes from midnight.
-- A record has start_min and end_min, or it has total_min.
create table if not exists public.work_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date date not null,
  kind text not null check (kind in ('regular', 'holiday_worked', 'holiday_not_worked')),
  start_min integer,
  end_min integer,
  total_min integer,
  break_min integer not null default 0,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, work_date)
);

alter table public.work_entries enable row level security;

drop policy if exists "owner only" on public.work_entries;
create policy "owner only" on public.work_entries
  for all
  to authenticated
  using (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com')
  with check (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com');

-- Step 4. The budget book. One row is one expense or one income.
-- fixed_id is set when the app made the row from a fixed cost.
-- The unique rule stops the same fixed cost from being saved twice on one date.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tx_date date not null,
  kind text not null check (kind in ('expense', 'income')),
  amount_cents integer not null check (amount_cents >= 0),
  category text not null default '',
  note text not null default '',
  fixed_id text,
  created_at timestamptz not null default now(),
  unique (user_id, fixed_id, tx_date)
);

create index if not exists transactions_by_date on public.transactions (user_id, tx_date);

alter table public.transactions enable row level security;

drop policy if exists "owner only" on public.transactions;
create policy "owner only" on public.transactions
  for all
  to authenticated
  using (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com')
  with check (user_id = auth.uid() and (auth.jwt() ->> 'email') = 'you@example.com');
