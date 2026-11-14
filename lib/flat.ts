/**
 * The Flat-details draft, as collected during onboarding and stored on
 * `onboarding_sessions.flat_draft` until `upsert_flat()` turns it into a
 * `flats` row at claim time (§4.3).
 *
 * Money is in PAISE, matching `flats.rent_share_paise` — integers only.
 * The index signature is deliberate: this crosses a Server Action boundary
 * and lands in a jsonb column, both of which want a plain serialisable object.
 */
export interface FlatDraft {
  area_slug: string | null;
  rent_share_paise: number | null;
  deposit_paise: number | null;
  bhk: string | null;
  amenities: string[];
  available_from: string | null;
  [key: string]: unknown;
}
