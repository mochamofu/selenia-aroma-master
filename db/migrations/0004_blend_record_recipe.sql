-- 制作記録に「どのアロマレシピ（型）から作ったか」を持たせる。
--
-- レシピの「実績」は、その型を実際に採用した回数で表す。回数をレシピ側に
-- 書き溜めると、記録を消したときにずれる。制作記録から数えれば常に事実と
-- 合う。ここが無いと数えようがないので、繋ぐ列を足す。
--
-- 測定値を平均したり点数に均したりはしない。数えるのは採用した回数だけ。
--
-- 型を使わずに作った記録もあるため、空を許す。レシピを消しても記録は
-- 残したいので、消えたときは繋ぎだけ外す。

ALTER TABLE blend_records ADD COLUMN recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blends_recipe ON blend_records(recipe_id);
