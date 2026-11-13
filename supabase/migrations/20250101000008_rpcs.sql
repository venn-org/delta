-- =============================================================================
-- 0008 · RPCs — the server-side enforcement points
-- docs/ARCHITECTURE.md §6.1, §6.2, §4.3
--
-- Reads go through RPCs rather than bespoke endpoints so web and a future
-- native client share one implementation of the rules (§11.1 rule 2).
-- =============================================================================

create or replace function upsert_flat(p_owner uuid, p_draft jsonb)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into flats (
    owner_id, area_id, rent_share_paise, deposit_paise,
    bhk, amenities, available_from, photo_paths
  )
  values (
    p_owner,
    (select id from areas where slug = p_draft ->> 'area_slug'),
    nullif(p_draft ->> 'rent_share_paise', '')::int,
    nullif(p_draft ->> 'deposit_paise', '')::int,
    p_draft ->> 'bhk',
    coalesce(
      (select array_agg(value) from jsonb_array_elements_text(p_draft -> 'amenities')),
      '{}'
    ),
    nullif(p_draft ->> 'available_from', '')::date,
    coalesce(
      (select array_agg(value) from jsonb_array_elements_text(p_draft -> 'photo_paths')),
      '{}'
    )
  )
  on conflict (owner_id) do update set
    area_id          = excluded.area_id,
    rent_share_paise = excluded.rent_share_paise,
    deposit_paise    = excluded.deposit_paise,
    bhk              = excluded.bhk,
    amenities        = excluded.amenities,
    available_from   = excluded.available_from,
    photo_paths      = excluded.photo_paths;
$$;

-- -----------------------------------------------------------------------------
-- Attach an anonymous onboarding session to a real user.
--
-- Idempotent: a double-submitted signup must not duplicate answers. Runs the
-- first match computation inline so the Finding screen covers a real wait.
-- -----------------------------------------------------------------------------
create or replace function claim_onboarding_session(
  p_session_id uuid,
  p_user_id uuid
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s onboarding_sessions;
  v_matches int;
begin
  select * into s
  from onboarding_sessions
  where id = p_session_id
    and expires_at > now()
    and (claimed_by is null or claimed_by = p_user_id)
  for update;

  if not found then
    raise exception 'session_unclaimable' using errcode = 'P0001';
  end if;

  insert into answers (user_id, question_key, value, ordinal)
  select p_user_id, e.key, e.value, question_ordinal(e.key, e.value)
  from jsonb_each(s.answers) as e(key, value)
  -- Ignores any key that is not a live question, so a stale cookie from
  -- before a question was retired cannot break signup.
  where exists (select 1 from questions q where q.key = e.key)
  on conflict (user_id, question_key) do update
    set value = excluded.value,
        ordinal = excluded.ordinal,
        updated_at = now();

  update profiles
  set role = coalesce(s.role, role),
      status = case when status = 'onboarding' then 'active' else status end
  where id = p_user_id;

  if s.flat_draft is not null then
    perform upsert_flat(p_user_id, s.flat_draft);
  end if;

  update onboarding_sessions
  set claimed_by = p_user_id, claimed_at = now()
  where id = p_session_id;

  -- Inline, not queued: the user is watching the Finding screen.
  v_matches := compute_matches_for(p_user_id);
  -- Everyone nearby now has a new candidate; they can wait for cron.
  perform enqueue_neighbours(p_user_id);

  return v_matches;
end;
$$;

-- -----------------------------------------------------------------------------
-- The free-tier gate. THE single projection the match list is read through.
--
-- For a locked match the name, age, occupation and avatar come back as SQL
-- NULL and `reasons` is trimmed to one tag — so the hidden data is never
-- serialised and the client's blur is purely cosmetic (§6.1).
-- -----------------------------------------------------------------------------
create or replace function get_match_list(p_viewer uuid default auth.uid())
returns table (
  candidate_id uuid,
  rank int,
  score int,
  is_locked boolean,
  area_name text,
  display_name text,
  age int,
  occupation text,
  avatar_path text,
  reasons jsonb,
  frictions jsonb,
  is_verified boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ent as (
    select has_entitlement(p_viewer, 'unlock_all') as unlocked
  )
  select
    mr.candidate_id,
    mr.rank,
    mr.score,
    not (e.unlocked or mr.rank <= 2) as is_locked,
    a.name as area_name,
    case when e.unlocked or mr.rank <= 2 then p.display_name end,
    case when e.unlocked or mr.rank <= 2 then p.age end,
    case when e.unlocked or mr.rank <= 2 then p.occupation end,
    case when e.unlocked or mr.rank <= 2 then p.avatar_path end,
    case when e.unlocked or mr.rank <= 2
         then mr.reasons
         else coalesce(jsonb_build_array(mr.reasons -> 0) - 'null', '[]'::jsonb)
    end,
    case when e.unlocked or mr.rank <= 2 then mr.frictions else '[]'::jsonb end,
    case when e.unlocked or mr.rank <= 2 then p.is_verified else false end
  from match_results mr
  join profiles p on p.id = mr.candidate_id
  left join areas a on a.id = p.home_area_id
  cross join ent e
  where mr.user_id = p_viewer
    and p_viewer = auth.uid()          -- cannot read someone else's list
    and is_visible_to(p_viewer, mr.candidate_id)
  order by mr.rank;
$$;

-- -----------------------------------------------------------------------------
-- Full side-by-side detail. Raises if the viewer has not paid for this one,
-- so guessing a UUID gets you nothing.
-- -----------------------------------------------------------------------------
create or replace function get_match_detail(
  p_candidate uuid,
  p_viewer uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row match_results;
  v_unlocked boolean;
  v_profile jsonb;
  v_answers jsonb;
begin
  if p_viewer is null or p_viewer <> auth.uid() then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_row
  from match_results
  where user_id = p_viewer and candidate_id = p_candidate;

  if not found or not is_visible_to(p_viewer, p_candidate) then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  v_unlocked := has_entitlement(p_viewer, 'unlock_all') or v_row.rank <= 2;
  if not v_unlocked then
    raise exception 'payment_required' using errcode = 'P0003';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'age', p.age,
    'occupation', p.occupation,
    'employer', p.employer,
    'avatarPath', p.avatar_path,
    'idealSunday', p.ideal_sunday,
    'petPeeve', p.pet_peeve,
    'isVerified', p.is_verified,
    'areaName', a.name
  )
  into v_profile
  from profiles p
  left join areas a on a.id = p.home_area_id
  where p.id = p_candidate;

  -- Side-by-side rows, ordered as the chat asked them.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'key', q.key,
      'prompt', q.prompt,
      'mine', mine.value,
      'theirs', theirs.value,
      'same', (v_row.breakdown -> q.key ->> 'sim')::numeric >= 0.85
    ) order by q.sort_order
  ), '[]'::jsonb)
  into v_answers
  from questions q
  left join answers mine   on mine.user_id = p_viewer and mine.question_key = q.key
  left join answers theirs on theirs.user_id = p_candidate and theirs.question_key = q.key
  where q.is_active and (mine.value is not null or theirs.value is not null);

  return jsonb_build_object(
    'score', v_row.score,
    'rank', v_row.rank,
    'reasons', v_row.reasons,
    'frictions', v_row.frictions,
    'profile', v_profile,
    'answers', v_answers
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Say hi. Requires the target be unlocked for the sender, or the ₹99 gate is
-- bypassable by anyone who learns a UUID.
-- -----------------------------------------------------------------------------
create or replace function send_interest(p_to uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_row match_results;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not consume_rate_limit('interest:' || v_me, 20, interval '1 day') then
    raise exception 'rate_limited' using errcode = 'P0004';
  end if;

  select * into v_row
  from match_results
  where user_id = v_me and candidate_id = p_to;

  if not found or not is_visible_to(v_me, p_to) then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  if not (has_entitlement(v_me, 'unlock_all') or v_row.rank <= 2) then
    raise exception 'payment_required' using errcode = 'P0003';
  end if;

  insert into interests (from_user, to_user, note)
  values (v_me, p_to, p_note)
  on conflict (from_user, to_user) do update
    set status = case when interests.status in ('passed', 'withdrawn', 'expired')
                      then 'pending' else interests.status end,
        note = coalesce(excluded.note, interests.note)
  returning id into v_id;

  perform notify_user(p_to, 'interest_received',
    jsonb_build_object('from', v_me, 'score', v_row.score));

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- The ONLY way a `matches` row is created, and the only place an
-- "It's a match" notification is written (§6.2).
-- -----------------------------------------------------------------------------
create or replace function accept_interest(p_interest_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i interests;
  m_id uuid;
  a uuid;
  b uuid;
begin
  select * into i
  from interests
  where id = p_interest_id and to_user = auth.uid() and status = 'pending'
  for update;

  if not found then
    raise exception 'interest_not_actionable' using errcode = 'P0005';
  end if;

  update interests set status = 'accepted', responded_at = now() where id = i.id;

  insert into interests (from_user, to_user, status, responded_at)
  values (i.to_user, i.from_user, 'accepted', now())
  on conflict (from_user, to_user) do update
    set status = 'accepted', responded_at = now();

  a := least(i.from_user, i.to_user);
  b := greatest(i.from_user, i.to_user);

  insert into matches (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do nothing
  returning id into m_id;

  if m_id is null then
    select id into m_id from matches where user_a = a and user_b = b;
  end if;

  insert into match_reads (match_id, user_id) values (m_id, a), (m_id, b)
  on conflict do nothing;

  perform notify_user(i.from_user, 'match_created', jsonb_build_object('match_id', m_id));
  perform notify_user(i.to_user,   'match_created', jsonb_build_object('match_id', m_id));

  return m_id;
end;
$$;

create or replace function pass_interest(p_interest_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i interests;
begin
  select * into i
  from interests
  where id = p_interest_id and to_user = auth.uid() and status = 'pending'
  for update;

  if not found then
    raise exception 'interest_not_actionable' using errcode = 'P0005';
  end if;

  update interests set status = 'passed', responded_at = now() where id = i.id;

  -- A pass is a hard filter from now on, so both lists need rebuilding.
  perform enqueue_match_job(i.from_user, 'passed', 3);
  perform enqueue_match_job(i.to_user, 'passed', 3);
end;
$$;

-- -----------------------------------------------------------------------------
-- Block: hides both directions and closes any open match.
-- -----------------------------------------------------------------------------
create or replace function block_user(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into blocks (blocker_id, blocked_id) values (v_me, p_target)
  on conflict do nothing;

  update matches
  set closed_at = now(), closed_reason = 'blocked'
  where closed_at is null
    and ((user_a = v_me and user_b = p_target)
      or (user_a = p_target and user_b = v_me));

  delete from match_results
  where (user_id = v_me and candidate_id = p_target)
     or (user_id = p_target and candidate_id = v_me);
end;
$$;

-- -----------------------------------------------------------------------------
-- Unread counts for the Chats tab, in one query.
-- -----------------------------------------------------------------------------
create or replace function get_chat_threads(p_viewer uuid default auth.uid())
returns table (
  match_id uuid,
  other_id uuid,
  other_name text,
  other_avatar_path text,
  last_body text,
  last_at timestamptz,
  unread_count int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    m.id,
    other.id,
    other.display_name,
    other.avatar_path,
    last_msg.body,
    last_msg.created_at,
    (select count(*)::int from messages msg
      where msg.match_id = m.id
        and msg.sender_id <> p_viewer
        and msg.id > coalesce(mr.last_read_id, 0))
  from matches m
  join profiles other
    on other.id = case when m.user_a = p_viewer then m.user_b else m.user_a end
  left join match_reads mr on mr.match_id = m.id and mr.user_id = p_viewer
  left join lateral (
    select body, created_at from messages
    where match_id = m.id order by id desc limit 1
  ) last_msg on true
  where p_viewer = auth.uid()
    and m.closed_at is null
    and (m.user_a = p_viewer or m.user_b = p_viewer)
  order by coalesce(last_msg.created_at, m.created_at) desc;
$$;
