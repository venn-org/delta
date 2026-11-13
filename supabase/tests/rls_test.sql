-- =============================================================================
-- RLS regression tests  ·  run with: npx supabase test db
--
-- Phase 0 exit criteria (docs/ARCHITECTURE.md §10): prove that user B cannot
-- read user A's private_contacts. Every policy that protects something real
-- gets a test asserting the NEGATIVE case, because a policy that accidentally
-- grants too much still looks fine from the owner's side.
-- =============================================================================

begin;
select plan(15);

-- --- Fixtures ---------------------------------------------------------------
-- handle_new_user() creates the profile and private_contacts rows for each.
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
   'kabir@example.com', 'x', now(), now(), now(), '{}', '{"full_name":"Kabir"}'),
  ('00000000-0000-0000-0000-000000000000',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated',
   'ishita@example.com', 'x', now(), now(), now(), '{}', '{"full_name":"Ishita"}'),
  ('00000000-0000-0000-0000-000000000000',
   'dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated',
   'rohan@example.com', 'x', now(), now(), now(), '{}', '{"full_name":"Rohan"}');

update private_contacts
set phone_e164 = '+919820100001'
where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update profiles
set status = 'active',
    role = 'seeker',
    home_area_id = (select id from areas where slug = 'powai'),
    age = 24
where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

-- A match list for Ananya: Kabir rank 1 (free), Ishita rank 2 (free),
-- Rohan rank 3 (locked behind the ₹99 unlock).
insert into match_results (user_id, candidate_id, score, rank, reasons, frictions)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   94, 1, '[{"key":"sleep","label":"Both night owls"}]', '[]'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   90, 2, '[{"key":"budget","label":"Same budget"}]', '[]'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   89, 3, '[{"key":"cooking","label":"Both cook daily"},{"key":"pets","label":"Both pet people"}]', '[{"key":"guests","label":"Hosts on weekends"}]');

-- =============================================================================
-- 1. private_contacts — the headline guarantee
-- =============================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is_empty(
  $$ select phone_e164 from private_contacts
     where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'B cannot read A''s private_contacts row'
);

select is_empty(
  $$ select phone_e164 from private_contacts where phone_e164 is not null
     and user_id <> auth.uid() $$,
  'No phone number of any other user is reachable'
);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select phone_e164 from private_contacts where user_id = auth.uid()),
  '+919820100001',
  'A can read A''s own phone number'
);

-- =============================================================================
-- 2. match_results — one user cannot read another's list
-- =============================================================================
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is_empty(
  $$ select 1 from match_results
     where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'B cannot read A''s match_results'
);

-- =============================================================================
-- 3. The free-tier projection (§6.1)
-- =============================================================================
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select count(*) from get_match_list()),
  3::bigint,
  'All three matches are listed'
);

select is(
  (select display_name from get_match_list() where rank = 1),
  'Kabir',
  'Rank 1 is fully revealed on the free tier'
);

select ok(
  (select display_name is null from get_match_list() where rank = 3),
  'Rank 3 name is NULL — never serialised, so there is nothing to blur'
);

select ok(
  (select avatar_path is null from get_match_list() where rank = 3),
  'Rank 3 avatar path is NULL, so no signed URL can be minted'
);

select ok(
  (select age is null and occupation is null from get_match_list() where rank = 3),
  'Rank 3 age and occupation are withheld'
);

select is(
  (select jsonb_array_length(reasons) from get_match_list() where rank = 3),
  1,
  'Locked match exposes exactly one reason tag'
);

select is(
  (select jsonb_array_length(frictions) from get_match_list() where rank = 3),
  0,
  'Locked match exposes no friction flags'
);

select throws_ok(
  $$ select get_match_detail('dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  'P0003',
  null,
  'Match detail for a locked profile raises payment_required'
);

select throws_ok(
  $$ insert into entitlements (user_id, kind, source)
     values (auth.uid(), 'unlock_all', 'grant') $$,
  '42501',
  null,
  'A user cannot grant themselves the unlock'
);

-- Granting the entitlement reveals it, through the same code path.
-- Note the role switch: `authenticated` CANNOT write here, because
-- entitlements are granted only by the webhook handler and moderation, both
-- of which use the service role. Having to escalate to run this line is
-- itself evidence the paywall cannot be self-granted from the client.
set local role postgres;
insert into entitlements (user_id, kind, source)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unlock_all', 'grant');
set local role authenticated;

select is(
  (select display_name from get_match_list() where rank = 3),
  'Rohan',
  'After unlocking, rank 3 is revealed'
);

-- =============================================================================
-- 4. Chat opens only after a mutual yes (§6.2)
-- =============================================================================
-- Again via postgres: `matches` has no INSERT policy at all, because
-- accept_interest() is the only thing allowed to create one.
set local role postgres;
insert into matches (user_a, user_b)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
set local role authenticated;

set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  format(
    $$ insert into messages (match_id, sender_id, body)
       values (%L, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'let me in') $$,
    (select id from matches limit 1)
  ),
  '42501',
  null,
  'A non-participant cannot post into someone else''s thread'
);

select * from finish();
rollback;
