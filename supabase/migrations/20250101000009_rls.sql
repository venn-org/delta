-- =============================================================================
-- 0009 · Row Level Security
-- docs/ARCHITECTURE.md §6.5 · ADR-007
--
-- RLS is the PRIMARY authorization boundary, not a second line of defence.
-- Server Components, Server Actions and Realtime all read the same tables, so
-- a check written once here cannot drift the way three copies in route
-- handlers would. Deny by default: a table with RLS on and no matching policy
-- returns zero rows.
-- =============================================================================

alter table areas               enable row level security;
alter table area_adjacency      enable row level security;
alter table questions           enable row level security;
alter table profiles            enable row level security;
alter table private_contacts    enable row level security;
alter table flats               enable row level security;
alter table answers             enable row level security;
alter table onboarding_sessions enable row level security;
alter table match_results       enable row level security;
alter table match_jobs          enable row level security;
alter table interests           enable row level security;
alter table matches             enable row level security;
alter table messages            enable row level security;
alter table match_reads         enable row level security;
alter table blocks              enable row level security;
alter table reports             enable row level security;
alter table verifications       enable row level security;
alter table notifications       enable row level security;
alter table orders              enable row level security;
alter table payment_events      enable row level security;
alter table entitlements        enable row level security;
alter table rate_limits         enable row level security;

-- --- Reference data ---------------------------------------------------------
-- Readable by anon too: the onboarding chat runs before signup.
create policy areas_read on areas
  for select to anon, authenticated using (true);

create policy area_adjacency_read on area_adjacency
  for select to anon, authenticated using (true);

create policy questions_read on questions
  for select to anon, authenticated using (is_active);

-- --- Profiles ---------------------------------------------------------------
create policy profiles_read on profiles
  for select to authenticated
  using (id = auth.uid() or is_visible_to(auth.uid(), id));

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- Private contacts -------------------------------------------------------
-- Self only. There is deliberately NO policy granting anyone else SELECT, so
-- phone numbers cannot leak even from a buggy join (§4.1).
create policy private_contacts_self on private_contacts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- Flats ------------------------------------------------------------------
create policy flats_read on flats
  for select to authenticated
  using (owner_id = auth.uid() or is_visible_to(auth.uid(), owner_id));

create policy flats_write_own on flats
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- --- Answers ----------------------------------------------------------------
-- Own answers only. Another user's answers are reachable solely through
-- get_match_detail(), which checks the entitlement first.
create policy answers_self on answers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- Onboarding sessions ----------------------------------------------------
-- No policies at all. These rows belong to an anonymous browser identified by
-- an httpOnly cookie, which the database cannot verify, so access goes through
-- server/onboarding/ with the service-role client.

-- --- Match results ----------------------------------------------------------
-- Readable raw by the owner, but the app always goes through get_match_list(),
-- which applies the free-tier redaction. This policy stops anyone reading
-- somebody else's list; it does not grant the paywalled fields.
create policy match_results_self on match_results
  for select to authenticated using (user_id = auth.uid());

-- --- match_jobs: service role only (no policies). ---------------------------

-- --- Interests --------------------------------------------------------------
create policy interests_read on interests
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- Writes go through send_interest / accept_interest / pass_interest, which
-- enforce the entitlement and the rate limit. No direct INSERT policy.
create policy interests_withdraw on interests
  for update to authenticated
  using (from_user = auth.uid())
  with check (from_user = auth.uid() and status = 'withdrawn');

-- --- Matches ----------------------------------------------------------------
create policy matches_read on matches
  for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- No INSERT policy: accept_interest() is the only creator (§6.2).

-- --- Messages ---------------------------------------------------------------
create policy messages_read on messages
  for select to authenticated
  using (exists (
    select 1 from matches m
    where m.id = messages.match_id
      and auth.uid() in (m.user_a, m.user_b)
  ));

-- Chat opens only after a mutual yes. No match row ⇒ this check fails ⇒ the
-- insert is rejected, whether it came from a Server Action or straight from
-- the browser client.
create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.closed_at is null
        and auth.uid() in (m.user_a, m.user_b)
    )
  );

-- --- Match reads ------------------------------------------------------------
create policy match_reads_self on match_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and auth.uid() in (m.user_a, m.user_b)
    )
  );

-- --- Blocks -----------------------------------------------------------------
create policy blocks_read_own on blocks
  for select to authenticated using (blocker_id = auth.uid());

create policy blocks_insert_own on blocks
  for insert to authenticated with check (blocker_id = auth.uid());

create policy blocks_delete_own on blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- --- Reports ----------------------------------------------------------------
create policy reports_read_own on reports
  for select to authenticated using (reporter_id = auth.uid());

create policy reports_insert_own on reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and reported_id <> auth.uid());

-- --- Verifications ----------------------------------------------------------
create policy verifications_read_own on verifications
  for select to authenticated using (user_id = auth.uid());

-- A user may submit evidence; only moderation (service role) may approve it,
-- and is_verified is trigger-maintained either way.
create policy verifications_insert_own on verifications
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- --- Notifications ----------------------------------------------------------
create policy notifications_read_own on notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_mark_read on notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- Billing ----------------------------------------------------------------
-- Read-only for the user. Every write is the webhook handler or cron, both of
-- which run with the service role (§6.4).
create policy orders_read_own on orders
  for select to authenticated using (user_id = auth.uid());

create policy entitlements_read_own on entitlements
  for select to authenticated using (user_id = auth.uid());

-- payment_events and rate_limits: no policies. Service role only.

-- =============================================================================
-- Function privileges
--
-- A SECURITY DEFINER function is executable by PUBLIC unless revoked, which
-- would hand a signed-in user the ability to run the match worker or forge a
-- notification. Lock the internals down; expose only the user-facing RPCs.
-- =============================================================================

revoke execute on function compute_matches_for(uuid)        from public, anon, authenticated;
revoke execute on function enqueue_match_job(uuid, text, int) from public, anon, authenticated;
revoke execute on function enqueue_neighbours(uuid)         from public, anon, authenticated;
revoke execute on function claim_match_jobs(int)            from public, anon, authenticated;
revoke execute on function claim_onboarding_session(uuid, uuid) from public, anon, authenticated;
revoke execute on function upsert_flat(uuid, jsonb)         from public, anon, authenticated;
revoke execute on function notify_user(uuid, text, jsonb)   from public, anon, authenticated;
revoke execute on function consume_rate_limit(text, int, interval) from public, anon, authenticated;
revoke execute on function handle_new_user()                from public, anon, authenticated;
revoke execute on function sync_is_verified()               from public, anon, authenticated;

-- User-facing RPCs. Each one re-derives the caller from auth.uid() rather
-- than trusting a parameter.
grant execute on function get_match_list(uuid)          to authenticated;
grant execute on function get_match_detail(uuid, uuid)  to authenticated;
grant execute on function get_chat_threads(uuid)        to authenticated;
grant execute on function send_interest(uuid, text)     to authenticated;
grant execute on function accept_interest(uuid)         to authenticated;
grant execute on function pass_interest(uuid)           to authenticated;
grant execute on function block_user(uuid)              to authenticated;
grant execute on function has_entitlement(uuid, text)   to authenticated;
grant execute on function is_visible_to(uuid, uuid)     to authenticated;
