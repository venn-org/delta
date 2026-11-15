-- =============================================================================
-- 0014 · Coverage becomes CITIES, and one question loses a brand name
--
-- WHY A NEW FILE. Migration 0011 is edited to match, so a fresh `db reset`
-- comes out right — but `db push` only applies migrations a database has not
-- seen. Editing 0011 alone would fix every new environment and no existing
-- one, which is the worst of both. The edit there is for the clean replay;
-- this file is for the databases that already ran it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Cities.
--
-- `areas` keeps its shape — (city, name, slug) — and a city is simply a row
-- where the two names agree. That is deliberate: making coverage city-level is
-- a DATA decision, and changing the table to match would throw away the
-- neighbourhood model we will want back the moment one city has enough density
-- to split.
-- -----------------------------------------------------------------------------
insert into areas (city, name, slug, is_live) values
  ('Mumbai',    'Mumbai',    'mumbai',    true),
  ('Delhi',     'Delhi',     'delhi',     true),
  ('Bangalore', 'Bangalore', 'bangalore', true),
  ('Hyderabad', 'Hyderabad', 'hyderabad', true)
on conflict (slug) do update set is_live = true;

-- Retire the Mumbai neighbourhoods. NOT deleted: `profiles.home_area_id` and
-- `flats.area_id` reference them, and answers hold their slugs, so a delete
-- would either fail on the foreign key or cascade away real rows. `is_live`
-- is the flag the app actually reads (server/onboarding/questions.ts filters
-- on it), so flipping it is enough to take them out of circulation while
-- leaving existing data intact and reversible.
update areas set is_live = false
 where slug in ('powai', 'andheri-w', 'vile-parle',
                'lower-parel', 'bandra-w', 'goregaon-e');

-- Adjacency is now meaningless and must go.
--
-- The graph says Powai is 0.70 commutable from Andheri. Between CITIES there
-- is no such thing — living in Mumbai is not partial credit for Delhi — and
-- leaving the old pairs in place would let the scorer award overlap to two
-- people in different cities via retired rows. Cities get no neighbours, so
-- locality becomes an exact match, which is what it should mean here.
delete from area_adjacency
 where area_id in (select id from areas where is_live = false)
    or neighbour_id in (select id from areas where is_live = false);

-- Anyone whose home area is now retired loses the pointer. compute_matches_for
-- guards on home_area_id being non-null and returns zero matches, so these
-- users must re-answer the locality question — correct, since the question
-- they answered no longer exists in the form they answered it.
update profiles set home_area_id = null
 where home_area_id in (select id from areas where is_live = false);

-- -----------------------------------------------------------------------------
-- Question copy: no brand names.
--
-- The question is about a habit, not a company. Naming one dates the copy,
-- reads as an endorsement we were not asked for, and means nothing to a user
-- who orders somewhere else.
-- -----------------------------------------------------------------------------
update questions
   set prompt = 'Do you cook, or is it mostly ordering in late at night?'
 where key = 'cooking';

-- The locality question asked about neighbourhoods and promised something the
-- city model cannot deliver: "I'll include nearby areas that are an easy
-- commute too." With no adjacency left, that ack would be a lie told to every
-- user who answers it.
update questions
   set prompt = 'Which city are you looking in?',
       helper = 'Pick as many as work for you.',
       ack    = 'Great. I''ll keep your matches to where you actually want to live.',
       match_label = 'Same city'
 where key = 'locality';
