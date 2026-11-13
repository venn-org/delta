-- =============================================================================
-- Seed · questions and Mumbai coverage areas
-- Runs on `supabase db reset`.
--
-- NOTE — a discrepancy in the designs worth resolving:
--   Chat-role.dc.html labels the role question "Question 1 of 10", while
--   Edit-answers.dc.html lists ten OTHER answers (sleep … pet peeve). That is
--   eleven questions if both are literal. Seeded as eleven here, with role at
--   sort_order 1. The progress bar counts live questions, so it stays correct
--   either way — but the copy should be settled before launch.
-- =============================================================================

-- --- Areas ------------------------------------------------------------------
insert into areas (city, name, slug, is_live) values
  ('Mumbai', 'Powai',        'powai',        true),
  ('Mumbai', 'Andheri West', 'andheri-w',    true),
  ('Mumbai', 'Vile Parle',   'vile-parle',   true),
  ('Mumbai', 'Lower Parel',  'lower-parel',  true),
  ('Mumbai', 'Bandra West',  'bandra-w',     false),
  ('Mumbai', 'Goregaon East','goregaon-e',   false)
on conflict (slug) do nothing;

-- Commutable-from graph, written both ways so adjacency lookups need no
-- OR-swap at query time.
with pairs(a, b, closeness) as (
  values
    ('powai',      'andheri-w',  0.70),
    ('powai',      'goregaon-e', 0.75),
    ('andheri-w',  'vile-parle', 0.85),
    ('andheri-w',  'goregaon-e', 0.80),
    ('vile-parle', 'lower-parel',0.45),
    ('andheri-w',  'bandra-w',   0.70),
    ('bandra-w',   'lower-parel',0.65)
)
insert into area_adjacency (area_id, neighbour_id, closeness)
select x.id, y.id, p.closeness
from pairs p
join areas x on x.slug = p.a
join areas y on y.slug = p.b
union all
select y.id, x.id, p.closeness
from pairs p
join areas x on x.slug = p.a
join areas y on y.slug = p.b
on conflict do nothing;

-- --- Questions --------------------------------------------------------------
insert into questions (
  key, sort_order, prompt, helper, answer_kind, options, comparator,
  ordinal_min, ordinal_max, weight, friction_sensitive,
  match_label, friction_label, asked_of
) values

-- 1 · Branches the flow. Never scored; it is a hard filter instead.
('role', 1,
 'First up: which one''s you?', null, 'single_choice',
 '[{"value":"seeker","label":"I''m looking for a flat","emoji":"🔍","helper":"Find flatmates and team up on a place"},
   {"value":"haver","label":"I have a flat, need a flatmate","emoji":"🏠","helper":"Fill a room in a place you already have"}]',
 'none', null, null, 0, false, null, null, '{seeker,haver}'),

-- 2 · Sleep
('sleep', 2,
 'Are you up late, or up early?', null, 'single_choice',
 '[{"value":"night_owl","label":"Night owl","ordinal":3,"match_label":"Both night owls","friction_label":"Up late most nights"},
   {"value":"early_bird","label":"Early bird","ordinal":1,"match_label":"Both early birds","friction_label":"Early riser"},
   {"value":"depends","label":"Depends","ordinal":2,"match_label":"Both flexible sleepers"}]',
 'exact', null, null, 1.3, true, 'Same sleep schedule', 'Different sleep schedules', '{seeker,haver}'),

-- 3 · Cleanliness
('cleanliness', 3,
 'How tidy do you keep shared space?', 'Be honest — this one causes the most arguments.',
 'scale', null, 'ordinal', 1, 5, 1.5, true,
 'Same tidiness bar', 'Different tidiness bars', '{seeker,haver}'),

-- 4 · Guests
('guests', 4,
 'How often do people come over?', null, 'single_choice',
 '[{"value":"rarely","label":"Rarely","ordinal":1,"match_label":"Both keep it quiet","friction_label":"Prefers a quiet flat"},
   {"value":"sometimes","label":"Once in a while","ordinal":2,"match_label":"Both host now and then"},
   {"value":"often","label":"Friends over often","ordinal":3,"match_label":"Both love hosting","friction_label":"Hosts on weekends"}]',
 'exact', null, null, 1.2, true, 'Same guest habits', 'Different guest habits', '{seeker,haver}'),

-- 5 · Cooking
('cooking', 5,
 'Do you cook?', null, 'single_choice',
 '[{"value":"daily","label":"Most days","match_label":"Both cook daily","friction_label":"Cooks most days"},
   {"value":"weekends","label":"Weekends","match_label":"Both weekend cooks"},
   {"value":"rarely","label":"Barely","match_label":"Neither really cooks"}]',
 'exact', null, null, 0.8, false, 'Same kitchen habits', null, '{seeker,haver}'),

-- 6 · Smoking and drinking
('smoking_drinking', 6,
 'Smoking or drinking at home?', null, 'single_choice',
 '[{"value":"neither","label":"Neither","match_label":"Both keep it clean","friction_label":"Prefers a smoke-free home"},
   {"value":"no_social","label":"No / socially","match_label":"Both social only"},
   {"value":"yes","label":"Yes, regularly","match_label":"Both fine with it","friction_label":"Smokes or drinks at home"}]',
 'exact', null, null, 1.4, true, 'Same house rules', 'Different house rules', '{seeker,haver}'),

-- 7 · Work
('work', 7,
 'Where do you work from?', null, 'single_choice',
 '[{"value":"office","label":"Office","match_label":"Both out all day"},
   {"value":"hybrid","label":"Hybrid","match_label":"Both hybrid"},
   {"value":"wfh","label":"Work from home","match_label":"Both home all day","friction_label":"Home all day"}]',
 'exact', null, null, 0.7, false, 'Same daily rhythm', null, '{seeker,haver}'),

-- 8 · Budget. Highest weight: no overlap is a hard filter, not a low score.
('budget', 8,
 'What''s your monthly budget for rent?', 'Your share, not the whole flat.',
 'range', null, 'range_overlap', null, null, 1.6, false,
 'Same budget', null, '{seeker,haver}'),

-- 9 · Locality
('locality', 9,
 'Where do you want to live?', 'Pick as many as work for you.',
 'area_multi', null, 'set_overlap', null, null, 1.5, false,
 'Same areas', null, '{seeker,haver}'),

-- 10 · Pets
('pets', 10,
 'Pets?', null, 'single_choice',
 '[{"value":"love","label":"Love them","match_label":"Both pet people"},
   {"value":"none_open","label":"Have none, open to them","match_label":"Both open to pets"},
   {"value":"no_pets","label":"Rather not","match_label":"Both prefer no pets","friction_label":"Would rather not live with pets"}]',
 'exact', null, null, 1.0, true, 'Same view on pets', 'Different views on pets', '{seeker,haver}'),

-- 11 · Free text. Shown on Match-detail, never scored.
('pet_peeve', 11,
 'Biggest flatmate pet peeve?', 'One line is plenty.',
 'free_text', null, 'none', null, null, 0, false, null, null, '{seeker,haver}')

on conflict (key) do nothing;
