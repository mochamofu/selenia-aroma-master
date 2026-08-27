import "server-only";

/**
 * ベースブレンドの内部配合比率。**クライアントバンドルに絶対に含めないこと。**
 *
 * `server-only` を import しているため、クライアントコンポーネントから
 * 参照するとビルド時にエラーになる。参照は `/api/base-blends/private` 経由のみ。
 *
 * Supabase 接続時は `base_blend_private_recipes` テーブル（RLS: 管理者のみ）が正となり、
 * ここの値はデモモード時のフォールバックとして使う。
 *
 * **ここに実際の配合比率を書かないこと。**
 * デモモードでは権限判定を通らないため、この値は URL を知っていれば取得できる。
 * 画面の動きを確認するための架空の値だけを置き、実際の比率は Supabase 側に持たせる。
 */

export type PrivateBaseBlendRecipe = {
  baseBlendId: string;
  internalRatio: string;
  privateNote: string;
};

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
