-- =============================================================================
-- 0007 · Matching engine
-- docs/ARCHITECTURE.md §4.6, §5 · ADR-003
-- =============================================================================

-- Derived state. Always safe to TRUNCATE and rebuild — which is what makes a
-- scoring bug a redeploy plus a backfill rather than a data migration.
create table match_results (
  user_id      uuid not null references profiles(id) on delete cascade,
  candidate_id uuid not null references profiles(id) on delete cascade,
  score        int  not null check (score between 0 and 100),
  -- Stored, not computed per request: the free tier's top 2 must be stable,
  -- or a user could refresh their way into seeing more than two profiles.
  rank         int  not null,
  breakdown    jsonb not null default '{}',
  reasons      jsonb not null default '[]',
  frictions    jsonb not null default '[]',
  computed_at  timestamptz not null default now(),
  primary key (user_id, candidate_id),
  check (user_id <> candidate_id)
);

create index match_results_rank_idx  on match_results (user_id, rank);
create index match_results_score_idx on match_results (user_id, score desc);

-- Queue. The partial unique index collapses duplicate pending jobs per user.
create table match_jobs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  reason     text not null,
  priority   int  not null default 5,
  attempts   int  not null default 0,
  locked_at  timestamptz,
  created_at timestamptz not null default now()
);

create unique index match_jobs_pending_idx on match_jobs (user_id)
  where locked_at is null;
create index match_jobs_claim_idx on match_jobs (priority, created_at)
  where locked_at is null;

-- -----------------------------------------------------------------------------
-- Area-set similarity.
--
-- Best matching pair rather than Jaccard: two people each listing three
-- localities who share one good one SHOULD score well. Jaccard would punish
-- them for also listing others.
-- -----------------------------------------------------------------------------
create or replace function venn_area_similarity(p_a jsonb, p_b jsonb)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(max(
    case
      when x.slug = y.slug then 1.0
      else coalesce((
        select adj.closeness
        from area_adjacency adj
        join areas ax on ax.id = adj.area_id
        join areas ay on ay.id = adj.neighbour_id
        where ax.slug = x.slug and ay.slug = y.slug
      ), 0)
    end
  ), 0)::numeric
  from jsonb_array_elements_text(coalesce(p_a -> 'areas', '[]'::jsonb)) as x(slug),
       jsonb_array_elements_text(coalesce(p_b -> 'areas', '[]'::jsonb)) as y(slug);
$$;

-- -----------------------------------------------------------------------------
-- Per-dimension similarity in [0,1].
--
-- The scorer dispatches on comparator and never names a question, so a new
-- question needs no change here (ADR-009).
-- -----------------------------------------------------------------------------
create or replace function venn_similarity(
  p_comparator comparator,
  p_min numeric,
  p_max numeric,
  p_a jsonb,
  p_b jsonb,
  p_a_ord numeric,
  p_b_ord numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  lo numeric; hi numeric; overlap numeric; width numeric;
begin
  case p_comparator
    when 'exact' then
      return case when p_a ->> 'choice' is not distinct from p_b ->> 'choice'
                  then 1.0 else 0.0 end;

    when 'ordinal' then
      if p_a_ord is null or p_b_ord is null or p_max is null or p_min is null
         or p_max = p_min then
        return null;
      end if;
      return greatest(0, 1 - abs(p_a_ord - p_b_ord) / (p_max - p_min));

    when 'range_overlap' then
      lo := greatest((p_a ->> 'min')::numeric, (p_b ->> 'min')::numeric);
      hi := least((p_a ->> 'max')::numeric, (p_b ->> 'max')::numeric);
      overlap := greatest(0, hi - lo);
      -- Normalise by the NARROWER range: someone with a tight budget fully
      -- inside a wide one is a perfect fit, not a partial one.
      width := least(
        (p_a ->> 'max')::numeric - (p_a ->> 'min')::numeric,
        (p_b ->> 'max')::numeric - (p_b ->> 'min')::numeric
      );
      if width is null then return null; end if;
      if width <= 0 then
        -- Degenerate (single-point) range: overlap is all-or-nothing.
        return case when overlap > 0 or lo = hi then 1.0 else 0.0 end;
      end if;
      return least(1.0, overlap / width);

    when 'set_overlap' then
      return venn_area_similarity(p_a, p_b);

    else
      return null;
  end case;
exception
  when others then
    -- A malformed answer must not take the whole match run down; the
    -- dimension is simply skipped.
    return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recompute one user's match list. Pure SQL, deterministic, no network calls.
-- Returns the number of candidates written.
-- -----------------------------------------------------------------------------
create or replace function compute_matches_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    profiles;
  v_live  boolean;
  v_count int := 0;
begin
  select * into v_me from profiles where id = p_user;

  -- Not matchable: clear any stale rows and stop.
  if not found or v_me.status <> 'active' or v_me.home_area_id is null then
    delete from match_results where user_id = p_user;
    return 0;
  end if;

  select is_live into v_live from areas where id = v_me.home_area_id;
  if not coalesce(v_live, false) then
    delete from match_results where user_id = p_user;
    return 0;
  end if;

  with candidates as (
    -- HARD FILTERS. Predicates, not score penalties: "would never work"
    -- must not be rescuable by scoring 98% on everything else (§5.1).
    select c.id
    from profiles c
    join areas ca on ca.id = c.home_area_id and ca.is_live
    where c.id <> p_user
      and c.status = 'active'
      -- Same area, or a curated commutable neighbour.
      and (
        c.home_area_id = v_me.home_area_id
        or exists (
          select 1 from area_adjacency aa
          where aa.area_id = v_me.home_area_id
            and aa.neighbour_id = c.home_area_id
        )
      )
      -- seeker↔haver and seeker↔seeker work. Two flat owners do not.
      and not (v_me.role = 'haver' and c.role = 'haver')
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = p_user and b.blocked_id = c.id)
           or (b.blocker_id = c.id   and b.blocked_id = p_user)
      )
      and not exists (
        select 1 from interests i
        where i.status = 'passed'
          and ((i.from_user = p_user and i.to_user = c.id)
            or (i.from_user = c.id   and i.to_user = p_user))
      )
  ),
  dims as (
    select
      cand.id as candidate_id,
      q.key,
      q.comparator,
      q.weight,
      q.friction_sensitive,
      venn_similarity(
        q.comparator, q.ordinal_min, q.ordinal_max,
        mine.value, theirs.value, mine.ordinal, theirs.ordinal
      ) as sim,
      -- Option-level copy when both picked the same option ("Both night
      -- owls"), else the question's fallback ("Same budget").
      coalesce(
        (select opt ->> 'match_label'
         from jsonb_array_elements(coalesce(q.options, '[]'::jsonb)) opt
         where opt ->> 'value' = mine.value ->> 'choice'
           and mine.value ->> 'choice' = theirs.value ->> 'choice'
         limit 1),
        q.match_label
      ) as match_label,
      -- Friction copy describes THEIR habit: "Hosts on weekends".
      coalesce(
        (select opt ->> 'friction_label'
         from jsonb_array_elements(coalesce(q.options, '[]'::jsonb)) opt
         where opt ->> 'value' = theirs.value ->> 'choice'
         limit 1),
        q.friction_label
      ) as friction_label
    from candidates cand
    join questions q
      on q.is_active and q.comparator <> 'none'
    join answers mine
      on mine.user_id = p_user and mine.question_key = q.key
    join answers theirs
      on theirs.user_id = cand.id and theirs.question_key = q.key
  ),
  scored as (
    select
      candidate_id,
      round(100 * sum(weight * sim) / nullif(sum(weight), 0))::int as score,
      jsonb_object_agg(
        key, jsonb_build_object('sim', round(sim, 3), 'w', weight)
      ) as breakdown,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', key, 'label', match_label)
          order by weight desc
        ) filter (where sim >= 0.85 and match_label is not null),
        '[]'::jsonb
      ) as reasons,
      coalesce(
        jsonb_agg(
          jsonb_build_object('key', key, 'label', friction_label)
          order by weight desc
        ) filter (where sim <= 0.4 and friction_sensitive
                    and friction_label is not null),
        '[]'::jsonb
      ) as frictions
    from dims
    where sim is not null
    group by candidate_id
    having sum(weight) > 0
       -- Budget that cannot overlap at all is a hard filter, expressed
       -- generically: any range dimension scoring zero disqualifies.
       and bool_and(not (comparator = 'range_overlap' and sim = 0))
  ),
  ranked as (
    select
      candidate_id, score, breakdown, reasons, frictions,
      row_number() over (order by score desc, candidate_id) as rank
    from scored
    -- Capped: beyond this nobody scrolls, and it bounds n² growth (§8.1).
    limit 200
  ),
  wipe as (
    delete from match_results where user_id = p_user
  )
  insert into match_results
    (user_id, candidate_id, score, rank, breakdown, reasons, frictions, computed_at)
  select p_user, candidate_id, score, rank::int, breakdown, reasons, frictions, now()
  from ranked;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Queue helpers
-- -----------------------------------------------------------------------------
create or replace function enqueue_match_job(
  p_user uuid,
  p_reason text,
  p_priority int default 5
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into match_jobs (user_id, reason, priority)
  values (p_user, p_reason, p_priority)
  on conflict (user_id) where locked_at is null do nothing;
$$;

-- Fan-out when someone new becomes matchable: everyone nearby needs their
-- list rebuilt. This is the O(n) step that justifies having a queue at all.
create or replace function enqueue_neighbours(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_area uuid;
  v_count int := 0;
begin
  select home_area_id into v_area from profiles where id = p_user;
  if v_area is null then return 0; end if;

  insert into match_jobs (user_id, reason, priority)
  select p.id, 'new_neighbour', 5
  from profiles p
  where p.id <> p_user
    and p.status = 'active'
    and (
      p.home_area_id = v_area
      or exists (
        select 1 from area_adjacency aa
        where aa.area_id = p.home_area_id and aa.neighbour_id = v_area
      )
    )
  on conflict (user_id) where locked_at is null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Claims a batch for the cron worker. SKIP LOCKED means two overlapping
-- cron ticks cannot process the same job.
create or replace function claim_match_jobs(p_limit int default 50)
returns setof match_jobs
language sql
security definer
set search_path = public, pg_temp
as $$
  update match_jobs
  set locked_at = now(), attempts = attempts + 1
  where id in (
    select id from match_jobs
    where locked_at is null
       -- Re-queue anything a dead worker left locked.
       or locked_at < now() - interval '5 minutes'
    order by priority, created_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;
