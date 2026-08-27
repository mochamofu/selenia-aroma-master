-- Selenia アロマカルテ / 初期スキーマ（Cloudflare D1 = SQLite）
--
-- 現在ブラウザ内に持っている内容を、そのままサーバー側へ移すための土台。
-- 多拠点運用（各地の施術者がカルテを作り、中央で参照する）を前提に、
-- すべての記録に作成した施術者を持たせている。
--
-- 適用: npx wrangler d1 execute selenia-karte --remote --file db/migrations/0001_init.sql

-- 施術者。各地の講師もここに入る。
CREATE TABLE IF NOT EXISTS operators (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  -- admin: 内部配合比率まで見える / instructor: 見えない
  role          TEXT NOT NULL CHECK (role IN ('admin', 'instructor')),
  -- パスワードはハッシュのみ保存する。平文は保存しない。
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  -- 所属拠点。多店舗展開時の絞り込みに使う。
  location      TEXT NOT NULL DEFAULT '',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ログインセッション。Cookie に入れるのはこの id だけにする。
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_operator ON sessions(operator_id);

-- 利用者。氏名は個人情報なので、参照はアプリ側の権限判定を通す。
CREATE TABLE IF NOT EXISTS clients (
  id             TEXT PRIMARY KEY,
  client_number  TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  name_kana      TEXT NOT NULL DEFAULT '',
  gender         TEXT NOT NULL DEFAULT '',
  birthday       TEXT NOT NULL DEFAULT '',
  occupation     TEXT NOT NULL DEFAULT '',
  first_visit_at TEXT NOT NULL DEFAULT '',
  last_visit_at  TEXT NOT NULL DEFAULT '',
  note           TEXT NOT NULL DEFAULT '',
  created_by     TEXT REFERENCES operators(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_number ON clients(client_number);

-- 禁忌・注意事項。1人に複数。
CREATE TABLE IF NOT EXISTS client_safety_notes (
  id         TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  severity   TEXT NOT NULL DEFAULT '注意',
  guidance   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_safety_client ON client_safety_notes(client_id);

-- 来店1回分のセッション。この単位で本日の測定がまとまる。
CREATE TABLE IF NOT EXISTS visits (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL REFERENCES operators(id),
  visited_on  TEXT NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(client_id, visited_on);

-- 1回の測定。1回につきリラックス度と集中度の2枚が出る。
CREATE TABLE IF NOT EXISTS measurements (
  id          TEXT PRIMARY KEY,
  visit_id    TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  -- trial: 当日の試作 / decided: 決定した組み合わせ
  scope       TEXT NOT NULL CHECK (scope IN ('trial', 'decided')),
  trial_no    INTEGER NOT NULL,
  trial_label TEXT NOT NULL DEFAULT '',
  measured_at TEXT NOT NULL,
  -- FocusCalm から書き出した CSV 本文。7波形すべてを保管する。
  raw_csv     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (visit_id, scope, trial_no)
);
CREATE INDEX IF NOT EXISTS idx_measurements_visit ON measurements(visit_id);

-- 測定画面から切り出したグラフ。実体は R2 に置き、ここは参照だけ持つ。
CREATE TABLE IF NOT EXISTS measurement_images (
  id             TEXT PRIMARY KEY,
  measurement_id TEXT NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  -- relax / focus / alpha / beta / gamma / delta / theta
  channel        TEXT NOT NULL,
  -- R2 のオブジェクトキー。
  object_key     TEXT NOT NULL,
  -- 重複判定に使う知覚ハッシュ。同じグラフの取り込みを弾く。
  content_hash   TEXT NOT NULL,
  detection_note TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_measurement ON measurement_images(measurement_id);
CREATE INDEX IF NOT EXISTS idx_images_hash ON measurement_images(content_hash);

-- 香り制作記録。
CREATE TABLE IF NOT EXISTS blend_records (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id       TEXT REFERENCES visits(id) ON DELETE SET NULL,
  operator_id    TEXT NOT NULL REFERENCES operators(id),
  title          TEXT NOT NULL,
  made_on        TEXT NOT NULL,
  base_blend_id  TEXT NOT NULL,
  total_volume_ml REAL NOT NULL DEFAULT 5,
  lot_number     TEXT NOT NULL DEFAULT '',
  maker_note     TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blends_client ON blend_records(client_id, made_on);

-- 配合の明細。
CREATE TABLE IF NOT EXISTS blend_items (
  id              TEXT PRIMARY KEY,
  blend_record_id TEXT NOT NULL REFERENCES blend_records(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  amount_ul       REAL NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blend_items_record ON blend_items(blend_record_id);

-- ベースブレンドの内部配合比率。管理者だけが読める。
-- アプリ側でロールを確認してから参照すること。
CREATE TABLE IF NOT EXISTS base_blend_private_recipes (
  base_blend_id  TEXT PRIMARY KEY,
  internal_ratio TEXT NOT NULL,
  private_note   TEXT NOT NULL DEFAULT '',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- アロマレシピ（よく使う型）。
CREATE TABLE IF NOT EXISTS recipes (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  base_blend_id  TEXT NOT NULL,
  base_amount_ul REAL NOT NULL DEFAULT 3000,
  purpose_tags   TEXT NOT NULL DEFAULT '',
  note           TEXT NOT NULL DEFAULT '',
  created_by     TEXT REFERENCES operators(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_oils (
  id         TEXT PRIMARY KEY,
  recipe_id  TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  amount_ul  REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_oils_recipe ON recipe_oils(recipe_id);

-- ヒアリングシートの回答。Googleフォーム連携時もここへ入れる。
CREATE TABLE IF NOT EXISTS hearing_sheets (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id          TEXT REFERENCES visits(id) ON DELETE SET NULL,
  source            TEXT NOT NULL DEFAULT '手動入力',
  submitted_at      TEXT NOT NULL,
  response_id       TEXT NOT NULL DEFAULT '',
  purpose_tags      TEXT NOT NULL DEFAULT '',
  desired_scent     TEXT NOT NULL DEFAULT '',
  preference_notes  TEXT NOT NULL DEFAULT '',
  health_notes      TEXT NOT NULL DEFAULT '',
  medication_notes  TEXT NOT NULL DEFAULT '',
  operator_summary  TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hearing_client ON hearing_sheets(client_id);

-- サロン設定。1行だけ持つ。
CREATE TABLE IF NOT EXISTS salon_settings (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  salon_name             TEXT NOT NULL DEFAULT 'Selenia',
  measurement_minutes    INTEGER NOT NULL DEFAULT 1,
  paired_measurement     INTEGER NOT NULL DEFAULT 1,
  report_includes_scores INTEGER NOT NULL DEFAULT 1,
  retention_months       INTEGER NOT NULL DEFAULT 24,
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
