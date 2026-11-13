-- =============================================================================
-- 0005 · Orders, payment events, entitlements
-- docs/ARCHITECTURE.md §4.8, §6.4 · ADR-005
-- =============================================================================

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  -- Integer paise. Never a float, never a numeric with rounding surprises.
  amount_paise       int not null check (amount_paise > 0),
  currency           text not null default 'INR',
  gateway            text not null default 'razorpay',
  gateway_order_id   text unique,
  gateway_payment_id text unique,
  status             order_status not null default 'created',
  failure_reason     text,
  -- Makes a double-tap on "Pay ₹99" reuse the order instead of creating two.
  idempotency_key    text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  paid_at            timestamptz
);

create index orders_user_idx on orders (user_id, created_at desc);
-- Drives the nightly reconciliation sweep for lost webhooks.
create index orders_stuck_idx on orders (status, created_at)
  where status in ('created', 'attempted');

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- Every webhook body, deduped by the gateway's own event id. This unique
-- index IS the idempotency boundary: a replayed webhook is a no-op insert.
create table payment_events (
  id               bigint generated always as identity primary key,
  gateway_event_id text not null unique,
  order_id         uuid references orders(id) on delete set null,
  event_type       text not null,
  payload          jsonb not null,
  signature_ok     boolean not null,
  processed_at     timestamptz,
  received_at      timestamptz not null default now()
);

-- Separate from orders on purpose: granting a free unlock to an early user
-- must not require faking an order, and "is this user unlocked?" stays one
-- indexed lookup however messy their order history is.
create table entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null,     -- 'unlock_all'
  source     text not null,     -- 'purchase' | 'grant' | 'promo' | 'iap_apple' | 'iap_google'
  order_id   uuid references orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- At most one live entitlement of a kind per user.
create unique index entitlements_live_idx
  on entitlements (user_id, kind)
  where revoked_at is null;

-- -----------------------------------------------------------------------------
-- The one question the paywall ever asks.
--
-- Deliberately ignorant of WHERE the money came from, so adding Apple/Google
-- IAP later is a new `source` value and nothing else (§11.2).
-- -----------------------------------------------------------------------------
create or replace function has_entitlement(p_user uuid, p_kind text default 'unlock_all')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from entitlements
    where user_id = p_user and kind = p_kind and revoked_at is null
  );
$$;
