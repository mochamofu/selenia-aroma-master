-- カルテのアプリが必要とする分を、いまある形の上に足す。
--
-- 本番の D1 には、このアプリより先にスキーマが入っていた（db/schema/existing.sql）。
-- 多店舗・監査・同意まで含んだ設計で、こちらはその形に合わせる。
-- したがって、ここでやるのは「足りない分を足す」ことだけ。
--
-- 既存のテーブルは1つも消さず、作り直しもしない。列を足すことはあるが、
-- すべて既定値つきなので、いま入っているデータはそのまま残る。
--
-- 対応関係（このアプリが必要とするもの → いまある形）:
--   施術者・利用者   → profiles（role で分ける）
--   ログイン         → credentials ＋ sessions
--   来店             → visits
--   測定画像         → brainwave_images（実体は R2、r2_key で参照）
--   香り制作記録     → aroma_records ＋ aroma_ingredients
--   ヒアリングシート → hearing_sheets
--   ベース内部比率   → base_blend_private_recipes
--
-- 足りなかったのは、測定回のまとまり・禁忌注意事項・アロマレシピ・
-- 店舗ごとの運用設定の4つ。

-- ============================================================
-- 測定回
-- ============================================================

-- 1回の測定でリラックス度と集中度の2枚が出る。brainwave_images だけでは
-- 「何回目に何を試したときの2枚か」がまとまらないので、束ねる表を足す。
CREATE TABLE IF NOT EXISTS measurements (
  id          text primary key,
  visit_id    text not null references visits(id) on delete cascade,
  -- trial: 当日の試作 / decided: 決定した組み合わせ
  scope       text not null,
  trial_no    integer not null,
  trial_label text not null default '',
  measured_at text not null,
  created_at  text not null default (datetime('now')),
  check (scope in ('trial', 'decided')),
  unique (visit_id, scope, trial_no)
);
CREATE INDEX IF NOT EXISTS idx_measurements_visit ON measurements(visit_id);

-- 測定画像に、どの測定回の何の波形かを持たせる。
-- すべて既定値つきなので、すでに入っている画像はそのまま残る。
ALTER TABLE brainwave_images ADD COLUMN measurement_id text REFERENCES measurements(id) ON DELETE CASCADE;

-- 写っている波形の種類。relax / focus / alpha / beta / gamma / delta / theta を
-- カンマ区切りで持つ。取り込み時の自動推定が複数を返すことがあるため複数形。
ALTER TABLE brainwave_images ADD COLUMN channels text NOT NULL DEFAULT '';

-- 画素の内容から出したハッシュ。同じグラフの二重取り込みを弾くために使う。
ALTER TABLE brainwave_images ADD COLUMN content_hash text NOT NULL DEFAULT '';

-- 自動推定の根拠。「なぜこう判定したか」を画面に出すために残す。
ALTER TABLE brainwave_images ADD COLUMN detection_note text NOT NULL DEFAULT '';

-- 施術者が手で書き足した覚え書き。
ALTER TABLE brainwave_images ADD COLUMN note text NOT NULL DEFAULT '';

-- sample: 画面確認用の見本 / upload: 実際に取り込んだもの。
ALTER TABLE brainwave_images ADD COLUMN source text NOT NULL DEFAULT 'upload';

-- 取り込んだ日時。測定日時（measured_at）とは別に持つ。
ALTER TABLE brainwave_images ADD COLUMN uploaded_at text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_brainwave_images_measurement ON brainwave_images(measurement_id);
CREATE INDEX IF NOT EXISTS idx_brainwave_images_hash ON brainwave_images(content_hash);

-- ============================================================
-- 禁忌・注意事項
-- ============================================================

-- hearing_sheets.safety_flags は、その回の回答に付いた印。
-- 妊娠中・既往症のように来店をまたいで有効な注意は、人に紐づけて持つ。
-- 同じ見出しが二重に並ぶと一覧で数え違いのもとになるので、重複を禁じる。
CREATE TABLE IF NOT EXISTS client_safety_notes (
  id         text primary key,
  user_id    text not null references profiles(user_id) on delete cascade,
  label      text not null,
  severity   text not null default '注意',
  guidance   text not null default '',
  created_at text not null default (datetime('now')),
  unique (user_id, label)
);
CREATE INDEX IF NOT EXISTS idx_safety_user ON client_safety_notes(user_id);

-- ============================================================
-- アロマレシピ（よく使う型）
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
  id             text primary key,
  name           text not null,
  base_blend_id  text references base_blends(id) on delete set null,
  base_amount_ul real not null default 3000,
  purpose_tags   text not null default '',
  note           text not null default '',
  created_by     text references profiles(user_id) on delete set null,
  created_at     text not null default (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_oils (
  id         text primary key,
  recipe_id  text not null references recipes(id) on delete cascade,
  name       text not null,
  amount_ul  real not null,
  sort_order integer not null default 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_oils_recipe ON recipe_oils(recipe_id);

-- どの型から作ったか。レシピの「実績」はここから数える。
-- 回数をレシピ側に書き溜めると記録を消したときにずれるが、数えれば事実と合う。
-- 型を使わずに作った記録もあるため空を許し、型を消しても記録は残す。
ALTER TABLE aroma_records ADD COLUMN recipe_id text REFERENCES recipes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_aroma_records_recipe ON aroma_records(recipe_id);

-- ============================================================
-- 店舗ごとの運用設定
-- ============================================================

-- 測定の既定値と保管期間は店舗ごとに揃える。端末のブラウザに置くと
-- 施術者ごとにばらつく。保管期間は個人情報の取り扱いに関わるため、
-- 店舗の情報として持つ。
ALTER TABLE stores ADD COLUMN measurement_minutes INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stores ADD COLUMN paired_measurement INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stores ADD COLUMN retention_months INTEGER NOT NULL DEFAULT 24;
