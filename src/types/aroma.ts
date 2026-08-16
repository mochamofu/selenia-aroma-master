export type IngredientUnit = "滴" | "ml" | "%";
export type AromaStatus = "draft" | "published";

export type AromaIngredient = {
  id: string;
  aroma_record_id: string;
  name: string;
  amount: string;
  unit: IngredientUnit;
  sort_order: number;
};

export type AromaRecord = {
  id: string;
  user_id: string;
  blend_lot_number?: string | null;
  base_blend_id?: string | null;
  base_blend_name?: string | null;
  base_blend_volume_ml?: number | null;
  brainwave_profile_id?: string | null;
  title: string;
  subtitle: string;
  concept: string;
  mood: string;
  purpose: string;
  blend_notes: string;
  usage_notes: string;
  caution_notes: string;
  product_image_url: string | null;
  reorder_url: string | null;
  price: number | null;
  volume: string | null;
  status: AromaStatus;
  created_at: string;
  updated_at: string;
  made_at: string;
  is_new?: boolean;
  favorite?: boolean;
  usage_count?: number;
  ingredients: AromaIngredient[];
};

export type BaseBlend = {
  id: string;
  name: string;
  code: string;
  description: string;
  public_ingredients: string[];
  benefits: string[];
  mood_slugs: string[];
  color: string;
};

export type EssentialOil = {
  id: string;
  slug: string;
  name: string;
  botanical_name: string;
  family: string;
  scent_note: "トップ" | "ミドル" | "ベース";
  scent_profile: string;
  overview: string;
  common_uses: string[];
  mood_slugs: string[];
  blends_well_with: string[];
  safety_note: string;
  color: string;
};

export type MoodCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  color: string;
  icon: string;
};
