-- 測定画像の表を、画面が実際に持っている情報に合わせる。
--
-- 0001 では 1枚 = 1チャンネルの前提で `channel` を1つだけ持たせていた。
-- 実際の取り込みでは自動推定が複数の候補を返すことがあり、画面側も
-- チャンネルを配列で扱っている。取りこぼさないよう複数形にする。
--
-- あわせて、これまで端末内にだけ持っていた見出し・備考・取り込み元・
-- 取り込み日時を保管できるようにする。ここが無いと、端末を替えたときに
-- 画像は残るのに「何回目の何を試したときのものか」が消える。
--
-- 0001 を適用済みでも未適用でも、この順に流せば同じ形になる。

ALTER TABLE measurement_images RENAME COLUMN channel TO channels;

-- 見出し。「② Woody Restore ＋ベルガモット / リラックス度」など。
ALTER TABLE measurement_images ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- 施術者が手で書き足した覚え書き。
ALTER TABLE measurement_images ADD COLUMN note TEXT NOT NULL DEFAULT '';

-- sample: 画面確認用の見本 / upload: 実際に取り込んだもの。
ALTER TABLE measurement_images ADD COLUMN source TEXT NOT NULL DEFAULT 'upload';

-- 取り込んだ日時。測定日時（measurements.measured_at）とは別に持つ。
ALTER TABLE measurement_images ADD COLUMN uploaded_at TEXT NOT NULL DEFAULT '';
