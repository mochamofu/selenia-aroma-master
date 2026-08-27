/**
 * 香りの系統（7分類）。
 *
 * `EssentialOil.family` は植物の科名（シソ科・ミカン科など）なので別物。
 * こちらは調香で使う香りの系統で、一覧の色分けと絞り込みに使う。
 *
 * 色は系統ごとに離して置き、隣り合う系統でも見分けがつくようにしている。
 */

export type ScentFamilySlug =
  | "citrus"
  | "floral"
  | "herbal"
  | "woody"
  | "resin"
  | "spice"
  | "oriental";

export type ScentFamily = {
  slug: ScentFamilySlug;
  label: string;
  /** 一覧の色チップと帯に使う色。 */
  color: string;
  description: string;
};

export const SCENT_FAMILIES: ScentFamily[] = [
  {
    slug: "citrus",
    label: "柑橘系",
    color: "#f2a93b",
    description: "明るく軽い果皮の香り。トップに置くと立ち上がりが分かりやすい。",
  },
  {
    slug: "floral",
    label: "フローラル系",
    color: "#e07ba6",
    description: "花の甘さと華やかさ。少量でも香りの印象を大きく動かす。",
  },
  {
    slug: "herbal",
    label: "ハーブ系",
    color: "#5fa86a",
    description: "青みとすっきり感。切り替えや集中の場面で選ばれやすい。",
  },
  {
    slug: "woody",
    label: "樹木系",
    color: "#5b8f8a",
    description: "森を思わせる乾いた香り。土台を作り、甘さを引き締める。",
  },
  {
    slug: "resin",
    label: "樹脂系",
    color: "#b08a4a",
    description: "樹液由来の深い香り。余韻が長く、静かな時間に向く。",
  },
  {
    slug: "spice",
    label: "スパイス系",
    color: "#c2593f",
    description: "温かく刺激のある香り。ごく少量でアクセントになる。",
  },
  {
    slug: "oriental",
    label: "オリエンタル系",
    color: "#8a6bbf",
    description: "甘く濃厚で個性が強い。香りを固定し、深みを出す。",
  },
];

/** 精油の slug から香りの系統を引く。 */
const FAMILY_BY_OIL: Record<string, ScentFamilySlug> = {
  // 柑橘系
  "sweet-orange": "citrus",
  bergamot: "citrus",
  lemon: "citrus",
  grapefruit: "citrus",
  lime: "citrus",
  mandarin: "citrus",
  // フローラル系
  lavender: "floral",
  geranium: "floral",
  "chamomile-roman": "floral",
  rose: "floral",
  neroli: "floral",
  jasmine: "floral",
  palmarosa: "floral",
  // ハーブ系
  peppermint: "herbal",
  rosemary: "herbal",
  "clary-sage": "herbal",
  lemongrass: "herbal",
  basil: "herbal",
  marjoram: "herbal",
  spearmint: "herbal",
  // 樹木系
  "tea-tree": "woody",
  eucalyptus: "woody",
  cedarwood: "woody",
  "juniper-berry": "woody",
  cypress: "woody",
  hinoki: "woody",
  // 樹脂系
  frankincense: "resin",
  myrrh: "resin",
  // スパイス系
  ginger: "spice",
  "black-pepper": "spice",
  clove: "spice",
  "cinnamon-leaf": "spice",
  // オリエンタル系
  "ylang-ylang": "oriental",
  sandalwood: "oriental",
  patchouli: "oriental",
  vetiver: "oriental",
};

const FALLBACK: ScentFamily = SCENT_FAMILIES[2];

export function scentFamilyOf(slug: string): ScentFamily {
  const familySlug = FAMILY_BY_OIL[slug];
  return SCENT_FAMILIES.find((family) => family.slug === familySlug) ?? FALLBACK;
}
