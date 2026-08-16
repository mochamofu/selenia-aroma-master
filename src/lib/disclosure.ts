import type { UserRole } from "@/types/profile";

/**
 * ベースブレンド情報の3段階開示モデル。
 *
 * public      顧客・未ログイン: 構成精油名、香りの印象、目的、使うシーン
 * instructor  認定インストラクター: 上記 + 使い分け指針、追加精油の相性、禁忌・注意
 * internal    管理者: 上記 + 内部配合比率、作成メモ
 *
 * 内部配合比率(internal)はクライアントのバンドルに含めない。
 * 取得は `/api/base-blends/private` 経由で、Supabase の RLS により管理者のみ許可される。
 */
export type DisclosureLevel = "public" | "instructor" | "internal";

const LEVEL_ORDER: Record<DisclosureLevel, number> = {
  public: 0,
  instructor: 1,
  internal: 2,
};

export function disclosureLevelForRole(role: UserRole | null | undefined): DisclosureLevel {
  if (role === "admin") return "internal";
  if (role === "instructor") return "instructor";
  return "public";
}

/** `level` が `required` 以上の開示範囲を持つか。 */
export function canDisclose(level: DisclosureLevel, required: DisclosureLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[required];
}

export const DISCLOSURE_LABELS: Record<DisclosureLevel, string> = {
  public: "一般公開",
  instructor: "認定インストラクター",
  internal: "管理者限定",
};

export const DISCLOSURE_DESCRIPTIONS: Record<DisclosureLevel, string> = {
  public: "構成精油名・香りの印象・目的・使うシーンまで表示します。",
  instructor: "上記に加えて、使い分け指針・追加精油の相性・注意事項を表示します。",
  internal: "上記に加えて、内部配合比率と作成メモを表示します。",
};
