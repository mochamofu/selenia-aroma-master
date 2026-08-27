"use client";

/**
 * アロマレシピ（定型の組み合わせ）。
 *
 * ベースブレンドに追加精油を合わせた「よく使う型」を登録しておき、
 * カウンセリングのときに候補として引ける状態にしておく。
 *
 * Supabase 接続前のつなぎとして、この端末のブラウザに保存する。
 * 将来、測定スコアの実績（このレシピを使った回のリラックス度・集中度）を
 * 集計して並べ替えられるよう、`outcome` の枠を先に用意してある。
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
   * 実績。いまは手入力の想定値だけを持つ。
   * カルテの測定と制作記録が保存されるようになったら、そこから自動で埋める。
   */
  outcome: {
    useCount: number;
    relaxAverage: number | null;
    focusAverage: number | null;
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
    outcome: { useCount: 12, relaxAverage: 68, focusAverage: 41 },
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
    outcome: { useCount: 9, relaxAverage: 44, focusAverage: 72 },
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
    outcome: { useCount: 7, relaxAverage: 61, focusAverage: 52 },
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

/**
 * 並べ替えの基準。
 * 実績のある型を上に出す。使用回数が少ないうちは信頼できないので、
 * 回数が一定に満たないものは控えめに扱う。
 */
export function recipeScore(recipe: AromaRecipe): number {
  const { useCount, relaxAverage, focusAverage } = recipe.outcome;
  if (useCount === 0) return 0;
  const best = Math.max(relaxAverage ?? 0, focusAverage ?? 0);
  const confidence = Math.min(useCount, 10) / 10;
  return best * confidence;
}
