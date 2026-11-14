-- =============================================================================
-- 0010 · Conversational copy for the onboarding chat
--
-- Chat-mobile.dc.html shows the bot replying to each answer ("Noted. Your
-- future flatmate won't judge your 2am Maggi.") before asking the next
-- question. That line is copy, so it belongs with the question in the
-- database rather than in a switch statement in the client (ADR-009).
-- =============================================================================

alter table questions
  add column if not exists ack text,
  add column if not exists placeholder text;

comment on column questions.ack is
  'Bot line shown after the user answers, before the next question.';
comment on column questions.placeholder is
  'Input placeholder for free_text / range questions.';

update questions set
  ack = 'Noted. Your future flatmate won''t judge your 2am Maggi.'
where key = 'sleep';

update questions set
  ack = 'Good to know. Dishes are the number one flatmate argument, so this one matters.'
where key = 'cleanliness';

update questions set
  ack = 'Got it. Better to agree on the vibe early than find out on a Friday night.'
where key = 'guests';

update questions set
  ack = 'Noted. Kitchen politics sorted.'
where key = 'cooking';

update questions set
  ack = 'Thanks — house rules are easier agreed upfront.'
where key = 'smoking_drinking';

update questions set
  ack = 'Right, that tells me how often you two would actually overlap at home.'
where key = 'work';

update questions set
  ack = 'Perfect. I''ll only show you people whose budget actually overlaps yours.',
  placeholder = 'e.g. 18000'
where key = 'budget';

update questions set
  ack = 'Great. I''ll include nearby areas that are an easy commute too.'
where key = 'locality';

update questions set
  ack = 'Noted.'
where key = 'pets';

update questions set
  ack = 'Love it. That''s the kind of detail that makes a match click.',
  placeholder = 'One line is plenty'
where key = 'pet_peeve';

update questions set
  ack = 'Nice, that helps me point you at the right people.'
where key = 'role';
