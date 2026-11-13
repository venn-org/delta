-- =============================================================================
-- 0004 · Interests, matches, messages, blocks
-- docs/ARCHITECTURE.md §4.7, §6.2
-- =============================================================================

create table interests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references profiles(id) on delete cascade,
  to_user      uuid not null references profiles(id) on delete cascade,
  note         text check (note is null or length(note) <= 500),
  status       interest_status not null default 'pending',
  responded_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

create index interests_inbox_idx on interests (to_user, status, created_at desc);
create index interests_sent_idx  on interests (from_user, status, created_at desc);

-- Canonical ordering (user_a < user_b) makes "do we have a match?" a
-- primary-key lookup and makes a duplicate match physically impossible.
create table matches (
  id            uuid primary key default gen_random_uuid(),
  user_a        uuid not null references profiles(id) on delete cascade,
  user_b        uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  closed_reason text,
  unique (user_a, user_b),
  check (user_a < user_b)
);

create index matches_user_a_idx on matches (user_a) where closed_at is null;
create index matches_user_b_idx on matches (user_b) where closed_at is null;

-- messages.match_id is NOT NULL with an FK, and only accept_interest() can
-- create a match. No mutual yes ⇒ no match row ⇒ no message can exist.
create table messages (
  id         bigint generated always as identity primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on messages (match_id, id desc);

-- A watermark, not a per-message read flag: one row per participant per
-- thread, so an unread count stays a single cheap query.
create table match_reads (
  match_id     uuid not null references matches(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  last_read_id bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (match_id, user_id)
);

create trigger match_reads_updated_at
  before update on match_reads
  for each row execute function set_updated_at();

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on blocks (blocked_id);

-- -----------------------------------------------------------------------------
-- The single definition of "can these two see each other".
--
-- Used by every policy and every query, so a block is invisible in both
-- directions and there is exactly one place to get this right.
-- -----------------------------------------------------------------------------
create or replace function is_visible_to(p_viewer uuid, p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p_viewer is not null
    and p_subject is not null
    and (
      p_viewer = p_subject
      or (
        exists (
          select 1 from profiles p
          where p.id = p_subject
            and p.status in ('active', 'paused', 'found_flat')
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = p_viewer  and b.blocked_id = p_subject)
             or (b.blocker_id = p_subject and b.blocked_id = p_viewer)
        )
      )
    );
$$;
