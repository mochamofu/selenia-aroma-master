create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.aroma_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blend_lot_number text,
  base_blend_id uuid,
  base_blend_name text,
  base_blend_volume_ml numeric,
  brainwave_profile_id text,
  title text not null,
  subtitle text not null default '',
  concept text not null default '',
  mood text not null default '',
  purpose text not null default '',
  blend_notes text not null default '',
  usage_notes text not null default '',
  caution_notes text not null default '',
  product_image_url text,
  reorder_url text,
  price integer,
  volume text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  made_at date not null default current_date
);

create table if not exists public.aroma_ingredients (
  id uuid primary key default gen_random_uuid(),
  aroma_record_id uuid not null references public.aroma_records(id) on delete cascade,
  name text not null,
  amount text not null,
  unit text not null check (unit in ('滴', 'ml', '%')),
  sort_order integer not null default 0
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aroma_record_id uuid not null references public.aroma_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, aroma_record_id)
);

create table if not exists public.mood_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  color text not null default '#B9A6D8'
);

create table if not exists public.base_blends (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  public_ingredients text[] not null default '{}',
  benefits text[] not null default '{}',
  color text not null default '#B9A6D8',
  created_at timestamptz not null default now()
);

create table if not exists public.base_blend_private_recipes (
  id uuid primary key default gen_random_uuid(),
  base_blend_id uuid not null references public.base_blends(id) on delete cascade,
  internal_ratio text not null,
  private_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.essential_oils (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  botanical_name text not null default '',
  family text not null default '',
  scent_note text not null default '',
  scent_profile text not null default '',
  overview text not null default '',
  common_uses text[] not null default '{}',
  mood_slugs text[] not null default '{}',
  blends_well_with text[] not null default '{}',
  safety_note text not null default '',
  color text not null default '#B9A6D8',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.aroma_records enable row level security;
alter table public.aroma_ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.mood_categories enable row level security;
alter table public.base_blends enable row level security;
alter table public.base_blend_private_recipes enable row level security;
alter table public.essential_oils enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_insert_delete" on public.profiles;
create policy "profiles_admin_insert_delete" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "records_customer_select_published_own" on public.aroma_records;
create policy "records_customer_select_published_own" on public.aroma_records
for select using ((user_id = auth.uid() and status = 'published') or public.is_admin());

drop policy if exists "records_admin_all" on public.aroma_records;
create policy "records_admin_all" on public.aroma_records
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ingredients_select_for_visible_records" on public.aroma_ingredients;
create policy "ingredients_select_for_visible_records" on public.aroma_ingredients
for select using (
  exists (
    select 1 from public.aroma_records r
    where r.id = aroma_record_id
    and ((r.user_id = auth.uid() and r.status = 'published') or public.is_admin())
  )
);

drop policy if exists "ingredients_admin_all" on public.aroma_ingredients;
create policy "ingredients_admin_all" on public.aroma_ingredients
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "favorites_customer_own" on public.favorites;
create policy "favorites_customer_own" on public.favorites
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "moods_authenticated_read" on public.mood_categories;
create policy "moods_authenticated_read" on public.mood_categories
for select using (auth.role() = 'authenticated');

drop policy if exists "moods_admin_all" on public.mood_categories;
create policy "moods_admin_all" on public.mood_categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "base_blends_authenticated_read" on public.base_blends;
create policy "base_blends_authenticated_read" on public.base_blends
for select using (auth.role() = 'authenticated');

drop policy if exists "base_blends_admin_all" on public.base_blends;
create policy "base_blends_admin_all" on public.base_blends
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "base_blend_private_recipes_admin_all" on public.base_blend_private_recipes;
create policy "base_blend_private_recipes_admin_all" on public.base_blend_private_recipes
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "essential_oils_authenticated_read" on public.essential_oils;
create policy "essential_oils_authenticated_read" on public.essential_oils
for select using (auth.role() = 'authenticated');

drop policy if exists "essential_oils_admin_all" on public.essential_oils;
create policy "essential_oils_admin_all" on public.essential_oils
for all using (public.is_admin()) with check (public.is_admin());

create index if not exists aroma_records_user_id_status_idx on public.aroma_records(user_id, status);
create index if not exists aroma_ingredients_record_idx on public.aroma_ingredients(aroma_record_id, sort_order);
create index if not exists favorites_user_record_idx on public.favorites(user_id, aroma_record_id);
create index if not exists base_blends_code_idx on public.base_blends(code);
create index if not exists essential_oils_slug_idx on public.essential_oils(slug);
