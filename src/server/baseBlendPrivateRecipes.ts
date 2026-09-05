import "server-only";
import { getDb } from "@/server/db";

/**
 * ベースブレンドの内部配合比率。**クライアントバンドルに絶対に含めないこと。**
 *
 * `server-only` を import しているため、クライアントコンポーネントから
 * 参照するとビルド時にエラーになる。参照は `/api/base-blends/private` 経由のみ。
 *
 * 正となるのは D1 の base_blend_private_recipes。誰が読めるかはアプリ側で
 * 判定する（管理者のみ）。ここの demo… は保存先が無い環境で画面の動きを
 * 確かめるためのもので、**実際の配合比率ではない**。
 *
 * **ここに実際の配合比率を書かないこと。**
 * 保存先が無い環境では権限判定を通らずに返るため、URL を知っていれば取得できる。
 */

export type PrivateBaseBlendRecipe = {
  baseBlendId: string;
  internalRatio: string;
  privateNote: string;
};

type RecipeRow = {
  base_blend_id: string;
  internal_ratio: string;
  private_note: string;
};

/**
 * 内部配合比率を読む。D1 が無ければ null。
 *
 * 呼び出し側で管理者かどうかを確かめてから使うこと。ここでは権限を見ない。
 */
export async function listPrivateBaseRecipes(): Promise<PrivateBaseBlendRecipe[] | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .prepare(
      "SELECT base_blend_id, internal_ratio, private_note FROM base_blend_private_recipes ORDER BY base_blend_id",
    )
    .all<RecipeRow>();

  return rows.results.map((row) => ({
    baseBlendId: row.base_blend_id,
    internalRatio: row.internal_ratio,
    privateNote: row.private_note,
  }));
}

export const demoPrivateBaseBlendRecipes: PrivateBaseBlendRecipe[] = [
  { baseBlendId: "base-01", internalRatio: "1 : 1 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-02", internalRatio: "2 : 1 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-03", internalRatio: "3 : 1 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-04", internalRatio: "1 : 2 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-05", internalRatio: "1 : 3 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-07", internalRatio: "2 : 2 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-09", internalRatio: "1 : 1 : 2", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-10", internalRatio: "3 : 2", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-12", internalRatio: "2 : 3 : 1", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-15", internalRatio: "1 : 2 : 2", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-16", internalRatio: "2 : 1 : 3", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
  { baseBlendId: "base-17", internalRatio: "1 : 1 : 3", privateNote: "デモ表示用の架空データです。実際の配合ではありません。" },
];
