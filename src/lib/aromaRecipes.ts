"use client";

/**
 * アロマレシピ（定型の組み合わせ）。
 *
 * ベースブレンドに追加精油を合わせた「よく使う型」を登録しておき、
 * カウンセリングのときに候補として引ける状態にしておく。
 *
 * Supabase 接続前のつなぎとして、この端末のブラウザに保存する。
 *
 * 実績として持つのは「この型を実際に採用した回数」だけにする。測定値を
 * 平均したり点数に均したりはしない。測定は1回ごとの推移に意味があり、
 * ならしてしまうと元の測定が表していたものが消えるため。
 */

export type RecipeOil = {
  name: string;
  amountUl: number;
};

export type AromaRecipe = {
  id: string;
  name: string;
  baseBlendId: string;
  baseAmountUl: number;
  oils: RecipeOil[];
  /** 「就寝前」「作業前」など、どんな場面で使う型か。 */
  purposeTags: string[];
  note: string;
  createdAt: string;
  /**
   * 実績。この型を実際に採用した回数。
   * 制作記録が保存されるようになったら、そこから数える。
   */
  outcome: {
    useCount: number;
  };
};

const STORAGE_KEY = "selenia.aromaRecipes.v1";

/** 初期表示用の型。実際の運用ではここに自分の型を足していく。 */
export const STARTER_RECIPES: AromaRecipe[] = [
  {
    id: "recipe-sleep-base",
    name: "就寝前のいちばん最初に出す型",
    baseBlendId: "base-05",
    baseAmountUl: 3000,
    oils: [
      { name: "ベルガモット", amountUl: 1000 },
      { name: "フランキンセンス", amountUl: 500 },
    ],
    purposeTags: ["就寝前", "緊張がほぐれない"],
    note: "香りに慣れていない方の1本目。甘さが出すぎないようフランキンセンスは少量にとどめる。",
    createdAt: "2026-04-02",
    outcome: { useCount: 12 },
  },
  {
    id: "recipe-morning-focus",
    name: "午前の切り替えの型",
    baseBlendId: "base-10",
    baseAmountUl: 3000,
    oils: [
      { name: "ローズマリー", amountUl: 800 },
      { name: "レモン", amountUl: 1200 },
    ],
    purposeTags: ["作業前", "集中が続かない"],
    note: "刺激が強く出やすいので、高血圧の申告がある方には別の型を使う。",
    createdAt: "2026-04-15",
    outcome: { useCount: 9 },
  },
  {
    id: "recipe-evening-reset",
    name: "夕方の切り替えの型",
    baseBlendId: "base-02",
    baseAmountUl: 3000,
    oils: [
      { name: "サイプレス", amountUl: 900 },
      { name: "スイートオレンジ", amountUl: 1100 },
    ],
    purposeTags: ["帰宅後", "疲労感"],
    note: "重くなりすぎないよう柑橘を必ず入れる。ウッディ単独だと沈む方がいる。",
    createdAt: "2026-05-06",
    outcome: { useCount: 7 },
  },
];

export function loadRecipes(): AromaRecipe[] {
  if (typeof window === "undefined") return STARTER_RECIPES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return STARTER_RECIPES;
    const parsed = JSON.parse(raw) as AromaRecipe[];
    return Array.isArray(parsed) ? parsed : STARTER_RECIPES;
  } catch {
    return STARTER_RECIPES;
  }
}

export function saveRecipes(recipes: AromaRecipe[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

/** 合計容量。mL 表示に使う。 */
export function totalVolumeUl(recipe: AromaRecipe): number {
  return recipe.baseAmountUl + recipe.oils.reduce((sum, oil) => sum + oil.amountUl, 0);
}

/** 並べ替えの基準。実際に採用した回数が多い型を上に出す。 */
export function recipeUseCount(recipe: AromaRecipe): number {
  return recipe.outcome.useCount;
}
