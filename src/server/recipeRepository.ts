import "server-only";
import { getDb } from "@/server/db";
import type { AromaRecipe, RecipeOil } from "@/lib/aromaRecipes";

/**
 * アロマレシピ（よく使う型）の読み書き。保存先は D1。
 *
 * 端末のブラウザに置いていたため、施術者ごとに手元の型がばらばらだった。
 * 各地の講師が使う型を中央で揃えるには、サーバー側に持つ必要がある。
 *
 * 「実績」は制作記録から数える。回数をレシピ側に書き溜めると、記録を
 * 消したときにずれる。数えれば常に事実と合う。測定値を平均したり
 * 点数に均したりはしない。
 */

type RecipeRow = {
  id: string;
  name: string;
  base_blend_id: string;
  base_amount_ul: number;
  purpose_tags: string;
  note: string;
  created_at: string;
  use_count: number;
};

type OilRow = {
  recipe_id: string;
  name: string;
  amount_ul: number;
};

/** 用途タグはカンマ区切りで1列に入れている。読むときにここで戻す。 */
function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/** レシピを新しい順に返す。D1 が無ければ null。 */
export async function listRecipes(): Promise<AromaRecipe[] | null> {
  const db = await getDb();
  if (!db) return null;

  const recipes = await db
    .prepare(
      `SELECT r.id, r.name, r.base_blend_id, r.base_amount_ul, r.purpose_tags, r.note,
              r.created_at,
              (SELECT COUNT(*) FROM blend_records b WHERE b.recipe_id = r.id) AS use_count
       FROM recipes r
       ORDER BY r.created_at DESC`,
    )
    .all<RecipeRow>();

  if (!recipes.results.length) return [];

  // 精油は1回でまとめて引く。件数分の往復を避けるため。
  const ids = recipes.results.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const oils = await db
    .prepare(
      `SELECT recipe_id, name, amount_ul FROM recipe_oils
       WHERE recipe_id IN (${placeholders}) ORDER BY sort_order`,
    )
    .bind(...ids)
    .all<OilRow>();

  const oilsByRecipe = new Map<string, RecipeOil[]>();
  for (const oil of oils.results) {
    const list = oilsByRecipe.get(oil.recipe_id) ?? [];
    list.push({ name: oil.name, amountUl: oil.amount_ul });
    oilsByRecipe.set(oil.recipe_id, list);
  }

  return recipes.results.map((row) => ({
    id: row.id,
    name: row.name,
    baseBlendId: row.base_blend_id,
    baseAmountUl: row.base_amount_ul,
    oils: oilsByRecipe.get(row.id) ?? [],
    purposeTags: parseTags(row.purpose_tags),
    note: row.note,
    createdAt: row.created_at.slice(0, 10),
    outcome: { useCount: row.use_count },
  }));
}

export type NewRecipe = {
  name: string;
  baseBlendId: string;
  baseAmountUl: number;
  oils: RecipeOil[];
  purposeTags: string[];
  note: string;
};

/** レシピを1件保存する。精油の明細も同じ処理でまとめて入れる。 */
export async function createRecipe(input: NewRecipe, operatorId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const id = crypto.randomUUID();
  await db.batch([
    db
      .prepare(
        `INSERT INTO recipes
           (id, name, base_blend_id, base_amount_ul, purpose_tags, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.baseBlendId,
        input.baseAmountUl,
        input.purposeTags.join(","),
        input.note,
        operatorId,
      ),
    ...input.oils.map((oil, index) =>
      db
        .prepare(
          "INSERT INTO recipe_oils (id, recipe_id, name, amount_ul, sort_order) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), id, oil.name, oil.amountUl, index),
    ),
  ]);
  return id;
}

/** レシピを消す。制作記録は残し、繋ぎだけ外れる。 */
export async function deleteRecipe(id: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.prepare("DELETE FROM recipes WHERE id = ?").bind(id).run();
  return true;
}
