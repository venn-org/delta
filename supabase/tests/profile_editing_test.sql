-- =============================================================================
-- Profile editing (migration 0015)  ·  run with: npx supabase test db
--
-- The negative cases matter most: a user may edit their own self-described
-- fields, and nothing else — not is_verified, not somebody else's row.
-- =============================================================================

begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
   'ananya@example.com', 'x', now(), now(), now(), '{}', '{"full_name":"Ananya"}'),
  ('00000000-0000-0000-0000-000000000000',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
   'kabir@example.com', 'x', now(), now(), now(), '{}', '{"full_name":"Kabir"}');

update profiles
set status = 'active',
    role = 'seeker',
    home_area_id = (select id from areas where slug = 'powai')
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

-- --- Column grant ------------------------------------------------------------
select lives_ok(
  $$ update profiles set display_name = 'Kabir S', age = 26, ideal_sunday = 'Cricket'
     where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'A user can edit their own self-described fields'
);

select throws_ok(
  $$ update profiles set is_verified = true
     where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501',
  null,
  'A user cannot mark themselves verified'
);

select throws_ok(
  $$ update profiles set status = 'paused'
     where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501',
  null,
  'A user cannot write their own status directly'
);

-- RLS still scopes the row: this matches nothing rather than erroring.
update profiles set display_name = 'hijacked'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- --- save_answer -------------------------------------------------------------
select lives_ok(
  $$ select save_answer('sleep', '{"choice":"night_owl"}') $$,
  'A user can change one of their answers'
);

select throws_ok(
  $$ select save_answer('role', '{"choice":"haver"}') $$,
  'P0007',
  null,
  'Role cannot be changed through save_answer'
);

set local role anon;
select throws_ok(
  $$ select save_answer('sleep', '{"choice":"early_bird"}') $$,
  '42501',
  null,
  'Signed-out visitors cannot call save_answer'
);

set local role postgres;

select is(
  (select display_name from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Ananya',
  'A user cannot rename somebody else'
);

select is(
  (select value from answers
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and question_key = 'sleep'),
  '{"choice":"night_owl"}'::jsonb,
  'save_answer stored the new value'
);

select * from finish();
rollback;
