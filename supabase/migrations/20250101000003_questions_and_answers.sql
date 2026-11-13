-- =============================================================================
-- 0003 · Questions, answers, onboarding sessions
-- docs/ARCHITECTURE.md §4.2, §4.3 · ADR-009
-- =============================================================================

-- Questions are DATA. The scorer dispatches on `comparator` and never names a
-- specific question, so adding or rewording one is an UPDATE, not a deploy.
create table questions (
  key          text primary key,
  sort_order   int  not null,
  prompt       text not null,
  helper       text,
  answer_kind  answer_kind not null,

  -- [{value, label, emoji, ordinal, match_label, friction_label}]
  -- `match_label`/`friction_label` are the tag copy shown on Match-detail.
  options      jsonb,

  comparator   comparator not null,
  -- Bounds for `ordinal` scoring. Explicit beats inferring from options.
  ordinal_min  numeric,
  ordinal_max  numeric,

  weight       numeric(4,2) not null default 1.0 check (weight >= 0),
  -- Only friction-sensitive questions can raise a heads-up flag (§5.1).
  friction_sensitive boolean not null default false,

  -- Fallback tag copy when no option-level label applies (ordinal/range).
  match_label    text,
  friction_label text,

  asked_of     user_role[] not null default '{seeker,haver}',
  is_active    boolean not null default true,
  version      int not null default 1,

  check (comparator <> 'ordinal'
         or (ordinal_min is not null and ordinal_max is not null
             and ordinal_max > ordinal_min))
);

create index questions_active_idx on questions (sort_order) where is_active;

-- One row per user per question.
create table answers (
  user_id      uuid not null references profiles(id) on delete cascade,
  question_key text not null references questions(key) on update cascade,
  -- Shape depends on answer_kind:
  --   single_choice {"choice":"night_owl"}   multi_choice {"choices":[...]}
  --   scale         {"value":4}              range        {"min":0,"max":0}
  --   free_text     {"text":"..."}           area_multi   {"areas":["powai"]}
  value        jsonb not null,
  -- Denormalised scale value, so ordinal scoring is arithmetic not jsonb work.
  ordinal      numeric,
  updated_at   timestamptz not null default now(),
  primary key (user_id, question_key)
);

create index answers_question_ordinal_idx on answers (question_key, ordinal);

create trigger answers_updated_at
  before update on answers
  for each row execute function set_updated_at();

-- Extracts the scalar used for ordinal comparison, so the claim function and
-- the app agree on how a value maps to a number.
create or replace function question_ordinal(p_key text, p_value jsonb)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  q questions;
begin
  select * into q from questions where key = p_key;
  if not found then return null; end if;

  if q.answer_kind = 'scale' then
    return nullif(p_value ->> 'value', '')::numeric;
  end if;

  if q.answer_kind = 'single_choice' then
    -- Pull the ordinal declared on the chosen option, if it has one.
    return (
      select nullif(opt ->> 'ordinal', '')::numeric
      from jsonb_array_elements(coalesce(q.options, '[]'::jsonb)) opt
      where opt ->> 'value' = p_value ->> 'choice'
      limit 1
    );
  end if;

  return null;
end;
$$;

-- --- Onboarding sessions ----------------------------------------------------
-- Answers live here before a user exists, keyed by an httpOnly cookie. This is
-- what lets the chat run before signup and survive the OAuth round-trip.
create table onboarding_sessions (
  id         uuid primary key default gen_random_uuid(),
  answers    jsonb not null default '{}',
  role       user_role,
  flat_draft jsonb,
  step       int not null default 0,
  claimed_by uuid references profiles(id) on delete set null,
  claimed_at timestamptz,
  user_agent text,
  -- Hashed. Used only to rate-limit session creation (§6.6).
  ip_hash    text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create index onboarding_sessions_sweep_idx on onboarding_sessions (expires_at)
  where claimed_by is null;
