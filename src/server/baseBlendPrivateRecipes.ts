import "server-only";

/**
 * ベースブレンドの内部配合比率。**クライアントバンドルに絶対に含めないこと。**
 *
 * `server-only` を import しているため、クライアントコンポーネントから
 * 参照するとビルド時にエラーになる。参照は `/api/base-blends/private` 経由のみ。
 *
 * Supabase 接続時は `base_blend_private_recipes` テーブル（RLS: 管理者のみ）が正となり、
 * ここの値はデモモード時のフォールバックとして使う。
 */

export type PrivateBaseBlendRecipe = {
  baseBlendId: string;
  internalRatio: string;
  privateNote: string;
};

export const demoPrivateBaseBlendRecipes: PrivateBaseBlendRecipe[] = [
  { baseBlendId: "base-01", internalRatio: "4 : 4 : 1", privateNote: "やわらかいフローラル軸。夜向けの初回提案に使いやすい。" },
  { baseBlendId: "base-02", internalRatio: "8 : 3 : 1", privateNote: "ウッディとハーブが強め。眠り前より回復感の設計に向く。" },
  { baseBlendId: "base-03", internalRatio: "10 : 1 : 1", privateNote: "樹脂系を中心にした重めの余韻。少量添加から調整。" },
  { baseBlendId: "base-04", internalRatio: "4 : 3 : 1", privateNote: "明るいフローラル。ティートリーで清潔感を足している。" },
  { baseBlendId: "base-05", internalRatio: "4 : 7 : 1", privateNote: "ラベンダー優位。測定後の緊張傾向が強い場合の候補。" },
  { baseBlendId: "base-07", internalRatio: "5 : 3 : 2", privateNote: "森林感がある鎮静系。呼吸を整えるテーマに合わせやすい。" },
  { baseBlendId: "base-09", internalRatio: "5 : 3 : 2", privateNote: "集中系。ミント添加時は刺激が強くなりすぎないようにする。" },
  { baseBlendId: "base-10", internalRatio: "3 : 2", privateNote: "軽いシトラス。朝・作業前の記録に合わせやすい。" },
  { baseBlendId: "base-12", internalRatio: "5 : 3 : 2", privateNote: "睡眠前の深い落ち着き向け。甘さが出すぎないよう調整。" },
  { baseBlendId: "base-15", internalRatio: "2 : 2 : 1", privateNote: "疲労感や活動前の印象作り。ジュニパーのドライ感を活かす。" },
  { baseBlendId: "base-16", internalRatio: "2 : 1 : 2", privateNote: "フローラルとハーバルのバランス型。香りの好み確認が重要。" },
  { baseBlendId: "base-17", internalRatio: "3 : 1 : 6", privateNote: "オレンジが強めで明るい。甘さの強い追加オイルは控えめに。" },
];
