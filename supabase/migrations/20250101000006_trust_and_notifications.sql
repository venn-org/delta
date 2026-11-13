-- =============================================================================
-- 0006 · Verification, reports, notifications, rate limits
-- docs/ARCHITECTURE.md §4.9, §6.6
-- =============================================================================

create table verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  method       verify_method not null,
  status       verify_status not null default 'pending',
  -- Storage path for a selfie. The image never lives in the database.
  evidence_ref text,
  reviewed_by  uuid references profiles(id) on delete set null,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, method)
);

create index verifications_queue_idx on verifications (status, created_at)
  where status = 'pending';

-- profiles.is_verified is DERIVED. Keeping it in a trigger means the blue tick
-- can never drift from the evidence behind it.
create or replace function sync_is_verified()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles p
  set is_verified = exists (
    select 1 from verifications v
    where v.user_id = target
      and v.status = 'approved'
      -- A phone or email alone is table stakes; the tick means a human or a
      -- workplace was actually checked.
      and v.method in ('work_email', 'selfie')
  )
  where p.id = target;
  return null;
end;
$$;

create trigger verifications_sync_tick
  after insert or update or delete on verifications
  for each row execute function sync_is_verified();

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  match_id    uuid references matches(id) on delete set null,
  reason      report_reason not null,
  detail      text check (detail is null or length(detail) <= 2000),
  status      report_status not null default 'open',
  resolution  text,
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

-- The 24h review SLA runs off this.
create index reports_open_idx on reports (status, created_at)
  where status in ('open', 'reviewing');

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,   -- 'match_created' | 'message' | 'interest' | ...
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_feed_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id)
  where read_at is null;

-- -----------------------------------------------------------------------------
-- The ONLY way a notification is written.
--
-- Single choke point so adding push fan-out later (device tokens, APNs/FCM)
-- is a change in one function rather than everywhere (§11.1 rule 5).
-- -----------------------------------------------------------------------------
create or replace function notify_user(
  p_user uuid,
  p_type text,
  p_payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into notifications (user_id, type, payload)
  values (p_user, p_type, coalesce(p_payload, '{}'::jsonb));
  -- Future: enqueue push here for every device token of p_user.
end;
$$;

-- --- Rate limits ------------------------------------------------------------
-- Postgres rather than Redis. At 1k MAU a counter table is plenty, and it
-- avoids an entire service to operate (ADR-002).
create table rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

create index rate_limits_sweep_idx on rate_limits (window_start);

-- Returns true when the action is allowed, and counts it.
create or replace function consume_rate_limit(
  p_bucket text,
  p_limit int,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  w timestamptz := date_bin(p_window, now(), timestamptz 'epoch');
  c int;
begin
  insert into rate_limits (bucket, window_start, count)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start)
    do update set count = rate_limits.count + 1
  returning count into c;

  return c <= p_limit;
end;
$$;
