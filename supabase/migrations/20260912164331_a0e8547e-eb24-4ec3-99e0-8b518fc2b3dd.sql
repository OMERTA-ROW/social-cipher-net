create table if not exists public.provider_health_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  action text not null,
  status text not null check (status in ('failure','fallback','recovered')),
  message text,
  symbol text,
  timeframe text,
  fallback_provider text,
  created_at timestamptz not null default now()
);

create index if not exists provider_health_events_created_idx
  on public.provider_health_events (created_at desc);
create index if not exists provider_health_events_provider_idx
  on public.provider_health_events (provider, status, created_at desc);

grant select on public.provider_health_events to authenticated;
grant all on public.provider_health_events to service_role;

alter table public.provider_health_events enable row level security;

drop policy if exists "Admins read provider health" on public.provider_health_events;
create policy "Admins read provider health"
on public.provider_health_events
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));