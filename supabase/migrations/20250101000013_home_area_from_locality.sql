-- =============================================================================
-- Promote the locality answer to profiles.home_area_id.
--
-- THE BUG THIS FIXES: nothing in the schema ever wrote home_area_id. The
-- onboarding chat collects areas as the `locality` answer — {"areas":[slug,…]}
-- — and the scorer compares those sets happily, but compute_matches_for
-- starts with
--
--     if ... or v_me.home_area_id is null then
--       delete from match_results where user_id = p_user;
--       return 0;
--
-- so every user fell out at the first guard and every match list came back
-- empty, no matter how many people signed up. The column is also what
-- get_match_list joins for the area label on a card, and what
-- enqueue_neighbours uses to decide who is nearby, so one unset column
-- silently disabled matching end to end.
--
-- WHICH AREA IS "HOME": the first slug the user picked, intersected with areas
-- that are live. The chat asks them to pick as many as work, and the order is
-- their own — the first is the one they want most. The full set still drives
-- scoring through venn_area_similarity; this column is only the anchor for the
-- hard filter and the label, so narrowing it loses nothing.
--
-- `coalesce(..., existing)` rather than a plain assignment: a re-claim with a
-- stale cookie must not blank an area that is already set.
-- =============================================================================

create or replace function home_area_from_answer(p_value jsonb)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select a.id
  from jsonb_array_elements_text(coalesce(p_value -> 'areas', '[]'::jsonb))
         with ordinality as picked(slug, pos)
  join areas a on a.slug = picked.slug
  where a.is_live
  order by picked.pos
  limit 1;
$$;

comment on function home_area_from_answer(jsonb) is
  'First live area in a locality answer, in the order the user picked them.';

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
      status = case when status = 'onboarding' then 'active' else status end,
      -- Set here, with the answers, because this is the only moment both the
      -- user and their locality answer exist. compute_matches_for below reads
      -- it immediately.
      home_area_id = coalesce(
        home_area_from_answer(s.answers -> 'locality'),
        home_area_id
      )
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

revoke execute on function claim_onboarding_session(uuid, uuid)
  from public, anon, authenticated;

-- --- Backfill ----------------------------------------------------------------
-- Anyone who signed up before this migration has answers but no home area, so
-- their list is empty and will stay empty until something recomputes it.
-- -----------------------------------------------------------------------------
update profiles p
set home_area_id = home_area_from_answer(a.value)
from answers a
where a.user_id = p.id
  and a.question_key = 'locality'
  and p.home_area_id is null
  and home_area_from_answer(a.value) is not null;

-- Recompute for everyone the backfill just gave an area to. Cheap at this
-- scale, and leaving them with a stale empty list would hide the fix.
select compute_matches_for(p.id)
from profiles p
where p.status = 'active'
  and p.home_area_id is not null;
