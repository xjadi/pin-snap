-- =====================================================================
-- Photo Pin Map — Supabase schema
-- Run this in the Supabase SQL editor.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Anonymous',
  avatar_url text not null default '',
  bio text default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can read profiles; users only update their own row.
create policy "profiles_read_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- pins ----------
create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade references public.profiles (id) on delete cascade,
  photo_url text not null,
  lat double precision not null,
  lng double precision not null,
  city text default '',
  country text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists pins_user_id_idx on public.pins (user_id);
create index if not exists pins_created_at_idx on public.pins (created_at desc);

alter table public.pins enable row level security;

-- All pins are public (read) so the landing map can show them.
create policy "pins_read_all"
  on public.pins for select
  using (true);

-- Only the owner can create/update/delete a pin.
create policy "pins_insert_self"
  on public.pins for insert
  with check (auth.uid() = user_id);

create policy "pins_update_self"
  on public.pins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pins_delete_self"
  on public.pins for delete
  using (auth.uid() = user_id);

-- ---------- auto-create a profile row on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Anonymous'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Migration: optional pin fields — title, visited_at, tags
-- Run these in the Supabase SQL editor (safe to re-run).
-- =====================================================================
alter table public.pins
  add column if not exists title text;

alter table public.pins
  add column if not exists visited_at date;

alter table public.pins
  add column if not exists tags text;