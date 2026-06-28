create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  role text not null default 'User',
  access_level text not null default 'View Only',
  status text not null default 'Active',
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_status_idx on public.app_users(status);

alter table public.app_users enable row level security;

drop policy if exists "Service role can manage app users" on public.app_users;
create policy "Service role can manage app users"
on public.app_users
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
