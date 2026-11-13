-- =============================================================================
-- 0002 · Areas, profiles, private contacts, flats
-- docs/ARCHITECTURE.md §4.1, §4.4, §4.5
-- =============================================================================

-- --- Areas ------------------------------------------------------------------
create table areas (
  id       uuid primary key default gen_random_uuid(),
  city     text not null,
  name     text not null,
  slug     text not null unique,
  -- Coverage gate. Launch one neighbourhood at a time (§8.3 cold start).
  is_live  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (city, name)
);

-- Hand-curated "commutable from" graph. A radius circle is the wrong model in
-- a city where 3km can be a 50-minute commute.
create table area_adjacency (
  area_id      uuid not null references areas(id) on delete cascade,
  neighbour_id uuid not null references areas(id) on delete cascade,
  closeness    numeric(3,2) not null default 0.5
               check (closeness > 0 and closeness <= 1),
  primary key (area_id, neighbour_id),
  check (area_id <> neighbour_id)
);

-- --- Profiles ---------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null default '',
  age            int check (age between 18 and 99),
  occupation     text,
  employer       text,
  role           user_role,
  home_area_id   uuid references areas(id),
  -- Storage object path, never a URL. Signed URLs are minted server-side
  -- after a visibility check (§6.3).
  avatar_path    text,
  ideal_sunday   text,
  pet_peeve      text,
  status         profile_status not null default 'onboarding',
  -- Derived from `verifications` by trigger; never written directly (§4.9).
  is_verified    boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index profiles_active_area_idx on profiles (home_area_id)
  where status = 'active';

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- --- Private contacts -------------------------------------------------------
-- Separate table, not columns on `profiles`. No policy below grants a third
-- party SELECT here, so "phone numbers are never exposed to other users"
-- is structural rather than a convention someone can forget (§4.1).
create table private_contacts (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  phone_e164        text unique,
  email             text,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  updated_at        timestamptz not null default now()
);

create trigger private_contacts_updated_at
  before update on private_contacts
  for each row execute function set_updated_at();

-- --- Flats ------------------------------------------------------------------
create table flats (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references profiles(id) on delete cascade,
  area_id          uuid references areas(id),
  rent_share_paise int check (rent_share_paise >= 0),
  deposit_paise    int check (deposit_paise >= 0),
  bhk              text,
  amenities        text[] not null default '{}',
  available_from   date,
  photo_paths      text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger flats_updated_at
  before update on flats
  for each row execute function set_updated_at();

-- --- New user bootstrap -----------------------------------------------------
-- Every auth.users row gets exactly one profile and one private_contacts row,
-- so downstream code never has to handle a missing profile.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.private_contacts (user_id, email, email_verified_at)
  values (new.id, new.email, new.email_confirmed_at)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
