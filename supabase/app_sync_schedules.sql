create table if not exists public.app_sync_schedules (
  name text primary key,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_sync_schedules_updated_at_idx
on public.app_sync_schedules (updated_at desc);

insert into public.app_sync_schedules (name, schedule)
values (
  'shopify-inventory',
  '{
    "time": "06:30",
    "frequency": "weekly",
    "days": ["F"],
    "timezone": "America/New_York",
    "enabled": true,
    "last_run_key": null,
    "last_run_at": null
  }'::jsonb
)
on conflict (name) do nothing;
