-- =============================================================================
-- 0001 · Extensions and enums
-- docs/ARCHITECTURE.md §4
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_cron";
create extension if not exists "pg_net" with schema extensions;
-- Used by supabase/tests. Harmless in production; it adds assertion
-- functions and nothing else.
create extension if not exists "pgtap" with schema extensions;

-- --- Identity ---------------------------------------------------------------
create type user_role as enum ('seeker', 'haver');

create type profile_status as enum (
  'onboarding',  -- answering the chat, not yet matchable
  'active',      -- matchable
  'paused',      -- hidden by choice
  'found_flat',  -- done; kept for history
  'banned'       -- moderation
);

-- --- Questions --------------------------------------------------------------
create type answer_kind as enum (
  'single_choice', 'multi_choice', 'scale', 'range', 'free_text', 'area_multi'
);

-- How the scorer compares two answers to this question (§5.1).
create type comparator as enum (
  'exact',          -- equal or not
  'ordinal',        -- distance on a scale
  'range_overlap',  -- numeric ranges, e.g. budget
  'set_overlap',    -- sets of areas, weighted by adjacency
  'none'            -- shown on the profile but never scored
);

-- --- Social -----------------------------------------------------------------
create type interest_status as enum (
  'pending', 'accepted', 'passed', 'expired', 'withdrawn'
);

-- --- Billing ----------------------------------------------------------------
create type order_status as enum (
  'created', 'attempted', 'paid', 'failed', 'refunded'
);

-- --- Trust ------------------------------------------------------------------
create type verify_method as enum ('phone', 'email', 'work_email', 'selfie');
create type verify_status as enum ('pending', 'approved', 'rejected');

create type report_reason as enum (
  'fake_profile', 'asked_for_money', 'harassment', 'other'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- --- Shared trigger ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
