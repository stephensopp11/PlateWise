-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── User Profiles ────────────────────────────────────────────────────────────
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  dietary_restrictions text[] default '{}',
  dietary_preferences text[] default '{}',
  created_at timestamptz default now()
);

-- ─── Taste Profiles ───────────────────────────────────────────────────────────
create table public.taste_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  -- Flavor axes (0–10)
  umami numeric(4,2) default 5,
  richness numeric(4,2) default 5,
  spice numeric(4,2) default 5,
  bitter_char numeric(4,2) default 5,
  bright_acid numeric(4,2) default 5,
  sweet numeric(4,2) default 5,
  -- Texture axes (0–10)
  crispy numeric(4,2) default 5,
  silky numeric(4,2) default 5,
  chewy numeric(4,2) default 5,
  creamy numeric(4,2) default 5,
  -- Meta
  quiz_completed boolean default false,
  meal_count integer default 0,
  updated_at timestamptz default now()
);

-- ─── Restaurants ──────────────────────────────────────────────────────────────
create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cuisine_type text,
  address text,
  created_at timestamptz default now()
);

-- ─── Menu Items ───────────────────────────────────────────────────────────────
create table public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price numeric(8,2),
  spice_level smallint check (spice_level between 0 and 5),
  richness_level smallint check (richness_level between 0 and 5),
  cuisine_category text,
  flavor_tags text[] default '{}',
  created_at timestamptz default now()
);

-- ─── Dish Scores (cache) ──────────────────────────────────────────────────────
create table public.dish_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  label text not null,
  explanation text,
  scored_at timestamptz default now(),
  unique (user_id, menu_item_id)
);

-- ─── Meals ────────────────────────────────────────────────────────────────────
create table public.meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  restaurant_name text,
  rating smallint not null check (rating between 1 and 10),
  notes text,
  photo_url text,
  flavor_notes jsonb,
  privacy text default 'friends' check (privacy in ('public', 'friends', 'private')),
  created_at timestamptz default now()
);

-- ─── Friendships ──────────────────────────────────────────────────────────────
create table public.friendships (
  id uuid primary key default uuid_generate_v4(),
  user_id_a uuid not null references auth.users(id) on delete cascade,
  user_id_b uuid not null references auth.users(id) on delete cascade,
  taste_twin_score smallint default 0 check (taste_twin_score between 0 and 100),
  status text default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (user_id_a, user_id_b)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;
alter table public.taste_profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.dish_scores enable row level security;
alter table public.meals enable row level security;
alter table public.friendships enable row level security;

-- user_profiles: users can read all, write own
create policy "Public read user_profiles" on public.user_profiles for select using (true);
create policy "Own write user_profiles" on public.user_profiles for all using (auth.uid() = id);

-- taste_profiles: users manage only their own
create policy "Own taste_profile" on public.taste_profiles for all using (auth.uid() = user_id);

-- restaurants: all authenticated users can read; anyone can insert
create policy "Read restaurants" on public.restaurants for select using (auth.role() = 'authenticated');
create policy "Insert restaurants" on public.restaurants for insert with check (auth.role() = 'authenticated');

-- menu_items: all authenticated users can read
create policy "Read menu_items" on public.menu_items for select using (auth.role() = 'authenticated');
create policy "Insert menu_items" on public.menu_items for insert with check (auth.role() = 'authenticated');

-- dish_scores: own only
create policy "Own dish_scores" on public.dish_scores for all using (auth.uid() = user_id);

-- meals: own + friends (simplified — friends-only logic handled at query level)
create policy "Own meals" on public.meals for all using (auth.uid() = user_id);
create policy "Public meals readable" on public.meals for select using (privacy = 'public');

-- friendships: participants only
create policy "Own friendships" on public.friendships for all
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);
