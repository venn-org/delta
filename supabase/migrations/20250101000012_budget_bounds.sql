-- =============================================================================
-- 0012 · Budget slider bounds
--
-- The budget question is answered with a two-handle range slider rather than
-- typed figures. Its end stops are data, not constants in the client, for the
-- same reason the options are (ADR-009): Mumbai rents move, and other cities
-- will need different stops.
--
-- ordinal_min/ordinal_max already exist for scale questions. The CHECK on
-- `questions` only constrains them when comparator = 'ordinal', so reusing
-- them as range bounds is allowed.
-- =============================================================================

update questions
set ordinal_min = 5000,     -- ₹5k floor
    ordinal_max = 50000     -- ₹50k ceiling
where key = 'budget';

comment on column questions.ordinal_min is
  'Scale questions: low end of the ordinal range. Range questions: slider floor.';
comment on column questions.ordinal_max is
  'Scale questions: high end of the ordinal range. Range questions: slider ceiling.';
