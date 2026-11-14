-- =============================================================================
-- 0011 · Reference data: coverage areas and the question set
--
-- These are NOT dev fixtures — production needs them, and production runs
-- migrations, never supabase/seed.sql. Keeping them here also fixes an
-- ordering bug: migration 0010 tried to UPDATE question copy, but on a fresh
-- `db reset` migrations run BEFORE the seed, so it matched zero rows and
-- every `ack` came out null.
--
-- Idempotent: areas are left alone once they exist (is_live is an operational
-- decision), while question copy is refreshed on every deploy.
-- =============================================================================

insert into areas (city, name, slug, is_live) values
  ('Mumbai', 'Powai',         'powai',       true),
  ('Mumbai', 'Andheri West',  'andheri-w',   true),
  ('Mumbai', 'Vile Parle',    'vile-parle',  true),
  ('Mumbai', 'Lower Parel',   'lower-parel', true),
  ('Mumbai', 'Bandra West',   'bandra-w',    false),
  ('Mumbai', 'Goregaon East', 'goregaon-e',  false)
on conflict (slug) do nothing;

-- Commutable-from graph, written both ways so adjacency lookups need no
-- OR-swap at query time.
with pairs(a, b, closeness) as (
  values
    ('powai',      'andheri-w',   0.70),
    ('powai',      'goregaon-e',  0.75),
    ('andheri-w',  'vile-parle',  0.85),
    ('andheri-w',  'goregaon-e',  0.80),
    ('vile-parle', 'lower-parel', 0.45),
    ('andheri-w',  'bandra-w',    0.70),
    ('bandra-w',   'lower-parel', 0.65)
)
insert into area_adjacency (area_id, neighbour_id, closeness)
select x.id, y.id, p.closeness from pairs p
  join areas x on x.slug = p.a join areas y on y.slug = p.b
union all
select y.id, x.id, p.closeness from pairs p
  join areas x on x.slug = p.a join areas y on y.slug = p.b
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Questions.
--
-- `ack` is the bot's reply after an answer, shown before the next question
-- (Chat-mobile.dc.html). It is copy, so it lives with the question rather
-- than in a switch in the client (ADR-009).
--
-- NOTE — a discrepancy in the designs worth resolving: Chat-role labels the
-- role question "Question 1 of 10", while Edit-answers lists ten OTHER
-- answers. That is eleven if both are literal, which is what is seeded here.
-- The progress bar counts live questions, so it stays correct either way.
-- -----------------------------------------------------------------------------
insert into questions (
  key, sort_order, prompt, helper, answer_kind, options, comparator,
  ordinal_min, ordinal_max, weight, friction_sensitive,
  match_label, friction_label, asked_of, ack, placeholder
) values

('role', 1,
 'First up: which one''s you?', null, 'single_choice',
 '[{"value":"seeker","label":"I''m looking for a flat","emoji":"🔍","helper":"Find flatmates and team up on a place"},
   {"value":"haver","label":"I have a flat, need a flatmate","emoji":"🏠","helper":"Fill a room in a place you already have"}]',
 'none', null, null, 0, false, null, null, '{seeker,haver}',
 'Nice, that helps me point you at the right people.', null),

('sleep', 2,
 'Are you up late, or up early?', null, 'single_choice',
 '[{"value":"night_owl","label":"Night owl","ordinal":3,"match_label":"Both night owls","friction_label":"Up late most nights"},
   {"value":"early_bird","label":"Early bird","ordinal":1,"match_label":"Both early birds","friction_label":"Early riser"},
   {"value":"depends","label":"Depends","ordinal":2,"match_label":"Both flexible sleepers"}]',
 'exact', null, null, 1.3, true, 'Same sleep schedule', 'Different sleep schedules', '{seeker,haver}',
 'Noted. Your future flatmate won''t judge your 2am Maggi.', null),

('cleanliness', 3,
 'How clean do you keep shared spaces?', 'Slide it honestly, nobody''s checking (yet).',
 'scale', null, 'ordinal', 1, 5, 1.5, true,
 'Same tidiness bar', 'Different tidiness bars', '{seeker,haver}',
 'Good to know. Dishes are the number one flatmate argument, so this one matters.', null),

('guests', 4,
 'How do you feel about guests and house parties?', null, 'single_choice',
 '[{"value":"rarely","label":"Rarely","ordinal":1,"match_label":"Both keep it quiet","friction_label":"Prefers a quiet flat"},
   {"value":"sometimes","label":"Once in a while","ordinal":2,"match_label":"Both host now and then"},
   {"value":"often","label":"Friends over often","ordinal":3,"match_label":"Both love hosting","friction_label":"Hosts on weekends"}]',
 'exact', null, null, 1.2, true, 'Same guest habits', 'Different guest habits', '{seeker,haver}',
 'Got it. Better to agree on the vibe early than find out on a Friday night.', null),

('cooking', 5,
 'Do you cook, or is Swiggy your flatmate already?', null, 'single_choice',
 '[{"value":"daily","label":"Most days","match_label":"Both cook daily","friction_label":"Cooks most days"},
   {"value":"weekends","label":"Weekends","match_label":"Both weekend cooks"},
   {"value":"rarely","label":"Barely","match_label":"Neither really cooks"}]',
 'exact', null, null, 0.8, false, 'Same kitchen habits', null, '{seeker,haver}',
 'Noted. Kitchen politics sorted.', null),

('smoking_drinking', 6,
 'Smoking or drinking at home?', null, 'single_choice',
 '[{"value":"neither","label":"Neither","match_label":"Both keep it clean","friction_label":"Prefers a smoke-free home"},
   {"value":"no_social","label":"No / socially","match_label":"Both social only"},
   {"value":"yes","label":"Yes, regularly","match_label":"Both fine with it","friction_label":"Smokes or drinks at home"}]',
 'exact', null, null, 1.4, true, 'Same house rules', 'Different house rules', '{seeker,haver}',
 'Thanks — house rules are easier agreed upfront.', null),

('work', 7,
 'Where do you work from?', null, 'single_choice',
 '[{"value":"office","label":"Office","match_label":"Both out all day"},
   {"value":"hybrid","label":"Hybrid","match_label":"Both hybrid"},
   {"value":"wfh","label":"Work from home","match_label":"Both home all day","friction_label":"Home all day"}]',
 'exact', null, null, 0.7, false, 'Same daily rhythm', null, '{seeker,haver}',
 'Right, that tells me how often you two would actually overlap at home.', null),

('budget', 8,
 'What''s your monthly budget for rent?', 'Your share, not the whole flat.',
 'range', null, 'range_overlap', 5000, 50000, 1.6, false,
 'Same budget', null, '{seeker,haver}',
 'Perfect. I''ll only show you people whose budget actually overlaps yours.', 'e.g. 18000'),

('locality', 9,
 'Where do you want to live?', 'Pick as many as work for you.',
 'area_multi', null, 'set_overlap', null, null, 1.5, false,
 'Same areas', null, '{seeker,haver}',
 'Great. I''ll include nearby areas that are an easy commute too.', null),

('pets', 10,
 'Pets?', null, 'single_choice',
 '[{"value":"love","label":"Love them","match_label":"Both pet people"},
   {"value":"none_open","label":"Have none, open to them","match_label":"Both open to pets"},
   {"value":"no_pets","label":"Rather not","match_label":"Both prefer no pets","friction_label":"Would rather not live with pets"}]',
 'exact', null, null, 1.0, true, 'Same view on pets', 'Different views on pets', '{seeker,haver}',
 'Noted.', null),

('pet_peeve', 11,
 'Biggest flatmate pet peeve?', 'One line is plenty.',
 'free_text', null, 'none', null, null, 0, false, null, null, '{seeker,haver}',
 'Love it. That''s the kind of detail that makes a match click.', 'One line is plenty')

on conflict (key) do update set
  sort_order         = excluded.sort_order,
  prompt             = excluded.prompt,
  helper             = excluded.helper,
  answer_kind        = excluded.answer_kind,
  options            = excluded.options,
  comparator         = excluded.comparator,
  ordinal_min        = excluded.ordinal_min,
  ordinal_max        = excluded.ordinal_max,
  weight             = excluded.weight,
  friction_sensitive = excluded.friction_sensitive,
  match_label        = excluded.match_label,
  friction_label     = excluded.friction_label,
  asked_of           = excluded.asked_of,
  ack                = excluded.ack,
  placeholder        = excluded.placeholder;
