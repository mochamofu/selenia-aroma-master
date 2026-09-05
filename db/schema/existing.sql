-- 本番の D1（selenia-aroma）に現在あるスキーマの写し。
--
-- このファイルは本番へ流すためのものではない。手元で開発と確認をするとき、
-- 本番と同じ形のデータベースを作るために使う。本番の形が正で、ここは写し。
--
-- 経緯: 本番の D1 には、カルテのアプリより先に別の手順でスキーマが入っていた。
-- 多店舗（stores / store_staff）、監査（audit_logs）、同意（consents）まで
-- 含んだ設計で、こちらのアプリはこの形に合わせる。
--
-- 出所の区別:
--   [確認済み] 本番の sqlite_master から読み出した定義をそのまま写した
--   [未確認]   supabase/schema.sql から起こした推定。参照だけで、書き込みはしない
--             （本番の定義を確認したら差し替える）

-- ============================================================
-- 店舗
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS stores (
  id text primary key,
  store_code text not null unique,
  name text not null,
  legal_name text not null default '',
  owner_name text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  address text not null default '',
  status text not null default 'active',
  joined_at text not null default (datetime('now')),
  closed_at text,
  note text not null default '',
  created_at text not null default (datetime('now')),
  check (length(store_code) = 3 and store_code glob '[0-9][0-9][0-9]'),
  check (status in ('active', 'paused', 'closed'))
);

-- ============================================================
-- 人（利用者・施術者・管理者を1つの表で持ち、role で分ける）
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS profiles (
  id text primary key,
  user_id text not null unique,
  store_id text references stores(id) on delete set null,
  origin_store_id text references stores(id) on delete set null,
  customer_number text unique,
  name text not null,
  name_kana text not null default '',
  birthday text,
  avatar_url text,
  role text not null default 'customer',
  last_visit_at text,
  favorite_types text not null default '[]',
  frequent_times text not null default '[]',
  created_at text not null default (datetime('now')),
  check (role in ('customer', 'admin', 'operator')),
  check (
    customer_number is null
    or (length(customer_number) = 7 and customer_number glob '[0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
  ),
  check (json_valid(favorite_types) and json_valid(frequent_times))
);

-- [確認済み]
CREATE TABLE IF NOT EXISTS store_staff (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  user_id text not null references profiles(user_id) on delete cascade,
  created_at text not null default (datetime('now')),
  unique (store_id, user_id)
);

-- ============================================================
-- ログイン
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS credentials (
  id text primary key,
  user_id text not null unique references profiles(user_id) on delete cascade,
  -- ログインID。メールアドレスを想定するが、形式は縛らない
  login_id text not null unique,
  -- PBKDF2-SHA256 の結果。'pbkdf2$<繰り返し回数>$<salt>$<hash>' の形で入れる
  password_hash text not null,
  -- 連続で失敗した回数。総当たりを遅くするために使う
  failed_attempts integer not null default 0,
  -- この時刻まではログインを受け付けない
  locked_until text,
  last_login_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

-- [確認済み]
CREATE TABLE IF NOT EXISTS sessions (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  -- Cookieに入れた token の SHA-256。ここから元の token は復元できない
  token_hash text not null unique,
  -- 施術者がどの店舗として操作しているか。利用者一覧の絞り込みに使う
  store_id text references stores(id) on delete set null,
  expires_at text not null,
  created_at text not null default (datetime('now')),
  last_seen_at text not null default (datetime('now')),
  -- 監査のために残す。個人を特定する目的では使わない
  user_agent text not null default ''
);

-- ============================================================
-- 来店とヒアリング
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS visits (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  user_id text not null references profiles(user_id) on delete cascade,
  staff_user_id text references profiles(user_id) on delete set null,
  session_number text unique,
  visited_at text not null default (datetime('now')),
  note text not null default '',
  created_at text not null default (datetime('now')),
  check (
    session_number is null
    or (length(session_number) = 11
        and session_number glob '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
  )
);

-- [確認済み]
CREATE TABLE IF NOT EXISTS hearing_sheets (
  id text primary key,
  aroma_record_id text references aroma_records(id) on delete cascade,
  user_id text not null references profiles(user_id) on delete cascade,
  source text not null default '手動入力',
  response_id text,
  submitted_at text,
  name_kana text not null default '',
  birthday text,
  purpose_tags text not null default '[]',
  desired_scent text not null default '',
  preference_notes text not null default '',
  health_notes text not null default '',
  medication_notes text not null default '',
  safety_flags text not null default '[]',
  operator_summary text not null default '',
  created_at text not null default (datetime('now')),
  check (json_valid(purpose_tags) and json_valid(safety_flags))
);

-- ============================================================
-- 測定
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS brainwave_images (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  r2_key text not null unique,
  title text not null default '',
  note text not null default '',
  measured_at text,
  created_at text not null default (datetime('now'))
);

-- ============================================================
-- 香りの記録
-- ============================================================

-- [確認済み]
CREATE TABLE IF NOT EXISTS aroma_records (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  brainwave_image_id text references brainwave_images(id) on delete set null,
  blend_lot_number text,
  base_blend_id text references base_blends(id) on delete set null,
  base_blend_name text,
  base_blend_volume_ml real,
  title text not null,
  subtitle text not null default '',
  concept text not null default '',
  mood text not null default '',
  purpose text not null default '',
  blend_notes text not null default '',
  usage_notes text not null default '',
  caution_notes text not null default '',
  maker_note text not null default '',
  total_volume_ml real,
  product_image_r2_key text,
  reorder_url text,
  price integer,
  volume text,
  status text not null default 'draft',
  made_at text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  check (status in ('draft', 'published'))
);

-- [確認済み]
CREATE TABLE IF NOT EXISTS aroma_ingredients (
  id text primary key,
  aroma_record_id text not null references aroma_records(id) on delete cascade,
  name text not null,
  amount text not null,
  unit text not null,
  sort_order integer not null default 0,
  check (unit in ('滴', 'ml', '%', 'uL'))
);

-- ============================================================
-- ベースブレンドと精油（原簿）
-- ============================================================

-- [未確認] supabase/schema.sql から起こした推定
CREATE TABLE IF NOT EXISTS base_blends (
  id text primary key,
  code text not null unique,
  name text not null,
  description text not null default '',
  public_ingredients text not null default '[]',
  benefits text not null default '[]',
  color text not null default '#B9A6D8',
  created_at text not null default (datetime('now'))
);

-- [確認済み]
CREATE TABLE IF NOT EXISTS base_blend_private_recipes (
  id text primary key,
  base_blend_id text not null references base_blends(id) on delete cascade,
  internal_ratio text not null,
  private_note text not null default '',
  created_at text not null default (datetime('now'))
);

-- [未確認] supabase/schema.sql から起こした推定
CREATE TABLE IF NOT EXISTS essential_oils (
  id text primary key,
  slug text not null unique,
  name text not null,
  botanical_name text not null default '',
  family text not null default '',
  scent_note text not null default '',
  scent_profile text not null default '',
  overview text not null default '',
  common_uses text not null default '[]',
  mood_slugs text not null default '[]',
  blends_well_with text not null default '[]',
  safety_note text not null default '',
  color text not null default '#B9A6D8',
  created_at text not null default (datetime('now'))
);

-- ============================================================
-- 利用者向けアプリ側（このアプリからは読まない）
-- ============================================================

-- [未確認] supabase/schema.sql から起こした推定
CREATE TABLE IF NOT EXISTS favorites (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  aroma_record_id text not null references aroma_records(id) on delete cascade,
  created_at text not null default (datetime('now')),
  unique (user_id, aroma_record_id)
);

-- [未確認] supabase/schema.sql から起こした推定
CREATE TABLE IF NOT EXISTS mood_categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  color text not null default '#B9A6D8'
);

-- [未確認] 本番に存在するが、定義は未取得。手元で参照だけできる形にしておく
CREATE TABLE IF NOT EXISTS consents (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  kind text not null default '',
  agreed_at text,
  created_at text not null default (datetime('now'))
);

-- [未確認] 本番に存在するが、定義は未取得。手元で参照だけできる形にしておく
CREATE TABLE IF NOT EXISTS audit_logs (
  id text primary key,
  user_id text references profiles(user_id) on delete set null,
  action text not null default '',
  target text not null default '',
  created_at text not null default (datetime('now'))
);
