-- =============================================================================
-- Profile editing.
--
-- 1. A narrow UPDATE grant on profiles.
--
--    profiles_update_self lets a user update their own row, and until now
--    every column of it: a signed-in user could PATCH is_verified, status,
--    role or home_area_id straight through the REST API. is_verified is meant
--    to be trigger-maintained from `verifications` (§4.9) and status/role are
--    set by the claim, so only the self-described fields are writable now.
--    RLS still decides WHICH row; the column grant decides WHAT in it.
--
-- 2. save_answer(key, value) — change one answer and refresh matches.
--
--    answers_self already lets a user write their own answers, but nothing
--    recomputed matches afterwards, and compute_matches_for is (rightly) not
--    executable by `authenticated`. This does both in one transaction, the
--    same way claim_onboarding_session does: the user's own list inline, the
--    neighbours queued.
--
--    Value SHAPE is validated by the server action (validateAnswer against
--    questions.options) before this is called. A caller going around the app
--    can already write any value through answers_self, so this widens nothing.
--
--    `role` is excluded: it decides which questions are asked at all (a flat
--    owner gets Flat-details), so changing it is a re-onboarding, not an edit.
-- =============================================================================

revoke update on profiles from authenticated;
grant update (display_name, age, occupation, employer, ideal_sunday)
  on profiles to authenticated;

create or replace function save_answer(p_key text, p_value jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_matches int;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from profiles where id = v_me and status = 'active') then
    raise exception 'profile_not_active' using errcode = 'P0006';
  end if;

  if p_key = 'role'
     or not exists (select 1 from questions where key = p_key and is_active) then
    raise exception 'unknown_question' using errcode = 'P0007';
  end if;

  -- Each save runs the scorer; cap it so the button cannot be used as a
  -- denial-of-service against the matcher.
  if not consume_rate_limit('answer_edit:' || v_me, 30, interval '1 hour') then
    raise exception 'rate_limited' using errcode = 'P0004';
  end if;

  insert into answers (user_id, question_key, value, ordinal)
  values (v_me, p_key, p_value, question_ordinal(p_key, p_value))
  on conflict (user_id, question_key) do update
    set value = excluded.value,
        ordinal = excluded.ordinal,
        updated_at = now();

  -- The locality answer is also the home area anchor (migration 0013).
  if p_key = 'locality' then
    update profiles
    set home_area_id = coalesce(home_area_from_answer(p_value), home_area_id)
    where id = v_me;
  end if;

  v_matches := compute_matches_for(v_me);
  perform enqueue_neighbours(v_me);

  return v_matches;
end;
$$;

revoke execute on function save_answer(text, jsonb) from public, anon;
grant execute on function save_answer(text, jsonb) to authenticated;
